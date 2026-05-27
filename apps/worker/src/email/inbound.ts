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
import { generateAndSendReply } from "../ai/reply.js";
import { detectAutoReply } from "../ai/bot-detector.js";
import { handleSuspectedBot, resetBotStreak } from "../ai/bot-handler.js";

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
    // 90s: socket sem atividade por 90s é considerado morto. Ocasiona um
    // reconnect periódico, mas garante que sockets travados sejam detectados
    // rápido — sem isso, e-mails novos podem ficar invisíveis indefinidamente.
    socketTimeout: 90_000,
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

  client.on("error", (err) => {
    logger.error({ err, accountId: account.id }, "IMAP socket error");
    const c = connections.get(account.id);
    if (c) {
      clearInterval(c.interval);
      connections.delete(account.id);
    }
  });

  let running = false;
  let runningSince = 0;
  const STUCK_THRESHOLD_MS = 2 * 60 * 1000;

  const tick = async () => {
    // Watchdog: se um tick está rodando há mais de 2min sem terminar,
    // o socket provavelmente está pendurado sem dar erro. Força reconnect.
    if (running && Date.now() - runningSince > STUCK_THRESHOLD_MS) {
      logger.warn(
        { accountId: account.id, stuckMs: Date.now() - runningSince },
        "IMAP tick pendurado — forçando reconnect"
      );
      const c = connections.get(account.id);
      if (c) {
        clearInterval(c.interval);
        connections.delete(account.id);
      }
      try {
        client.close();
      } catch {
        // ignora
      }
      return;
    }
    if (running) return;
    running = true;
    runningSince = Date.now();
    try {
      await checkNewMessages(account, client);
    } catch (err) {
      // "Connection not available" é eco do socket já morto — já logamos como
      // "IMAP socket error". Evita ruído duplicado.
      if ((err as { code?: string })?.code !== "NoConnection") {
        logger.error({ err, accountId: account.id }, "Erro no IMAP poll");
      }
    } finally {
      running = false;
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

  const botCheck = detectAutoReply(text);
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
        suspectedBot: botCheck.isLikelyBot,
        botConfidence: botCheck.confidence,
        botReasons: botCheck.reasons,
      },
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastMessageAt: new Date() },
  });

  // Se essa mensagem parece de bot/autoresponder, conta consecutivas.
  // 2+ → pausa AI e marca lead. 1ª: continua tentando com prompt humano.
  if (botCheck.isLikelyBot) {
    const { shouldPause } = await handleSuspectedBot({
      conversationId: conversation.id,
      leadId: lead.id,
      userId: account.userId,
      reason: botCheck.reasons.join("; "),
    });
    if (shouldPause) {
      logger.info(
        { from: fromAddr, reasons: botCheck.reasons },
        "🤖 2+ respostas automáticas — IA pausada, alerta criado"
      );
      return;
    }
    logger.info(
      { from: fromAddr, confidence: botCheck.confidence },
      "🤖 1ª resposta possivelmente automática — IA vai tentar abordagem mais humana"
    );
    // continua → AI reply será gerado com este sinal no prompt (futuramente)
  } else {
    // Mensagem normal → reseta contador se havia suspeita anterior
    await resetBotStreak(conversation.id);
  }

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

  generateAndSendReply(conversation.id).catch((err) =>
    logger.error({ err, conversationId: conversation.id }, "Erro no reply IA")
  );
}
