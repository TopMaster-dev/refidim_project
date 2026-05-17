import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import {
  prisma,
  Channel,
  MessageDirection,
  MessageSender,
  LeadStatus,
  type EmailAccount,
} from "@refidim/database";
import { decryptSecret, OPT_OUT_KEYWORDS } from "@refidim/shared";
import { logger } from "../logger.js";

const POLL_INTERVAL_MS = 30_000;

interface ActiveConnection {
  client: ImapFlow;
  interval: NodeJS.Timeout;
}

const connections = new Map<string, ActiveConnection>();

/**
 * Inicia o polling IMAP para uma conta. Verifica INBOX a cada 30s
 * por mensagens não lidas, parseia e roteia para o Lead correspondente.
 */
export async function startImapForAccount(account: EmailAccount): Promise<void> {
  if (connections.has(account.id)) return;
  if (!account.imapHost || !account.imapPort || !account.imapUser || !account.imapPassEnc) {
    logger.warn({ accountId: account.id }, "EmailAccount sem IMAP — pulando inbound");
    return;
  }

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    auth: {
      user: account.imapUser,
      pass: decryptSecret(account.imapPassEnc),
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
    logger.info({ accountId: account.id, email: account.fromEmail }, "📬 IMAP conectado");
  } catch (err) {
    logger.error({ err, accountId: account.id }, "Falha ao conectar IMAP");
    await client.logout().catch(() => {});
    return;
  }

  const tick = async () => {
    try {
      await checkNewMessages(account, client);
    } catch (err) {
      logger.error({ err, accountId: account.id }, "Erro no IMAP poll");
    }
  };

  const interval = setInterval(tick, POLL_INTERVAL_MS);
  connections.set(account.id, { client, interval });

  // Tick inicial após pequeno delay
  setTimeout(tick, 2000);
}

export async function stopImapForAccount(accountId: string): Promise<void> {
  const c = connections.get(accountId);
  if (!c) return;
  clearInterval(c.interval);
  try {
    await c.client.logout();
  } catch {
    // ignora
  }
  connections.delete(accountId);
  logger.info({ accountId }, "IMAP desconectado");
}

export async function shutdownAllImap() {
  for (const id of connections.keys()) {
    await stopImapForAccount(id);
  }
}

async function checkNewMessages(account: EmailAccount, client: ImapFlow) {
  const lock = await client.getMailboxLock("INBOX");
  try {
    // Busca não lidas
    for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true, uid: true })) {
      try {
        const parsed = await simpleParser(msg.source as Buffer);
        await routeIncomingEmail(account, parsed, msg.uid);

        // Marca como lida pra não reprocessar
        await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
      } catch (err) {
        logger.error({ err, uid: msg.uid }, "Erro processando e-mail individual");
      }
    }
  } finally {
    lock.release();
  }
}

async function routeIncomingEmail(
  account: EmailAccount,
  parsed: ParsedMail,
  uid: number
) {
  const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase();
  if (!fromAddr) return;

  // Ignora mensagens do próprio remetente
  if (fromAddr === account.fromEmail.toLowerCase()) return;

  const text = parsed.text?.trim() || parsed.subject || "";
  if (!text) return;

  logger.info({ from: fromAddr, subject: parsed.subject?.slice(0, 60) }, "📩 E-mail recebido");

  // Localiza Contact + Lead ativo do usuário desta EmailAccount
  const contact = await prisma.contact.findFirst({
    where: {
      email: fromAddr,
      contactList: { userId: account.userId },
    },
    include: {
      leads: {
        where: {
          status: { notIn: [LeadStatus.OPTED_OUT, LeadStatus.HANDED_OFF] },
          job: { userId: account.userId, channel: Channel.EMAIL },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { conversation: true },
      },
    },
  });

  if (!contact || contact.leads.length === 0) {
    logger.info({ from: fromAddr }, "E-mail de endereço não cadastrado — ignorando");
    return;
  }

  const lead = contact.leads[0]!;

  const conversation =
    lead.conversation ??
    (await prisma.conversation.create({
      data: {
        leadId: lead.id,
        channel: Channel.EMAIL,
        externalId: parsed.messageId ?? undefined,
      },
    }));

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
      body: text,
      metadata: {
        subject: parsed.subject,
        messageId: parsed.messageId,
        from: fromAddr,
        uid,
        date: parsed.date?.toISOString(),
      },
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastMessageAt: new Date() },
  });

  // Opt-out
  const normalized = text.toLowerCase();
  if (OPT_OUT_KEYWORDS.some((kw) => normalized.includes(kw))) {
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.OPTED_OUT },
      }),
      prisma.contact.update({
        where: { id: contact.id },
        data: { isOptedOut: true },
      }),
    ]);
    logger.info({ leadId: lead.id, from: fromAddr }, "🚫 Lead pediu opt-out por e-mail");
    return;
  }

  // (Fase 6) Aqui virá: enfileirar AI_REPLY
  logger.info({ leadId: lead.id }, "E-mail armazenado — aguardando IA (Fase 6)");
}
