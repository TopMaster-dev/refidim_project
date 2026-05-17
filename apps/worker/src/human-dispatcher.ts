import { prisma, MessageDirection, MessageSender, Channel } from "@refidim/database";
import { logger } from "./logger.js";
import { isSessionActive, sendText as sendWhatsApp } from "./whatsapp/service.js";

const POLL_INTERVAL_MS = 3000;

let pollHandle: NodeJS.Timeout | null = null;

export function startHumanDispatcher() {
  if (pollHandle) return;
  logger.info("👤 Human dispatcher iniciado");
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no human dispatcher"));
  }, POLL_INTERVAL_MS);
}

export function stopHumanDispatcher() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  // Busca mensagens HUMAN pendentes
  const pending = await prisma.message.findMany({
    where: {
      direction: MessageDirection.OUTBOUND,
      sender: MessageSender.HUMAN,
      // Filtra por flag em metadata (JSON path)
      metadata: { path: ["pendingDispatch"], equals: true },
    },
    include: {
      conversation: {
        include: {
          lead: {
            include: { contact: true, job: true },
          },
        },
      },
    },
    take: 20,
  });

  for (const msg of pending) {
    try {
      await dispatchMessage(msg);
    } catch (err) {
      logger.error({ err, messageId: msg.id }, "Falha ao despachar msg HUMAN");
      // Marca como falha pra não tentar de novo (poderia ter retry com counter, mas MVP)
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          metadata: {
            ...(typeof msg.metadata === "object" && msg.metadata !== null ? msg.metadata : {}),
            pendingDispatch: false,
            dispatchError: (err as Error).message,
          },
        },
      });
    }
  }
}

async function dispatchMessage(
  msg: {
    id: string;
    body: string;
    metadata: unknown;
    conversation: {
      channel: Channel;
      lead: {
        contact: { phone: string | null; email: string | null };
        job: { userId: string };
      };
    };
  }
) {
  const { conversation, body } = msg;
  const { lead } = conversation;
  const userId = lead.job.userId;

  if (conversation.channel === Channel.WHATSAPP) {
    if (!isSessionActive(userId)) {
      throw new Error("Sessão WhatsApp inativa — peça para conectar em /painel/canais");
    }
    if (!lead.contact.phone) throw new Error("Contato sem telefone");
    const result = await sendWhatsApp(userId, lead.contact.phone, body);
    await prisma.message.update({
      where: { id: msg.id },
      data: {
        metadata: {
          ...(typeof msg.metadata === "object" && msg.metadata !== null ? msg.metadata : {}),
          pendingDispatch: false,
          messageId: result?.messageId,
          sentAt: new Date().toISOString(),
        },
      },
    });
    logger.info({ msgId: msg.id, channel: "WHATSAPP" }, "👤 Mensagem HUMAN enviada");
  } else if (conversation.channel === Channel.EMAIL) {
    // E-mail manual usa o EmailAccount preferido do usuário/consultor
    const account = await prisma.emailAccount.findFirst({
      where: { userId, isActive: true },
      orderBy: { consultantId: { sort: "desc", nulls: "last" } },
    });
    if (!account) throw new Error("Nenhuma EmailAccount ativa");
    if (!lead.contact.email) throw new Error("Contato sem e-mail");

    const { decryptSecret } = await import("@refidim/shared");
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: { user: account.smtpUser, pass: decryptSecret(account.smtpPassEnc) },
    });
    const info = await transporter.sendMail({
      from: { name: account.fromName, address: account.fromEmail },
      to: lead.contact.email,
      subject: "Continuação",
      text: body,
    });
    await prisma.message.update({
      where: { id: msg.id },
      data: {
        metadata: {
          ...(typeof msg.metadata === "object" && msg.metadata !== null ? msg.metadata : {}),
          pendingDispatch: false,
          messageId: info.messageId,
          accountId: account.id,
        },
      },
    });
    logger.info({ msgId: msg.id, channel: "EMAIL" }, "👤 Mensagem HUMAN enviada");
  }
}
