import nodemailer, { type Transporter } from "nodemailer";
import {
  prisma,
  MessageDirection,
  MessageSender,
  Channel,
  type EmailAccount,
} from "@refidim/database";
import { decryptSecret, SEND_DELAY_MS, SEND_WINDOW } from "@refidim/shared";
import { logger } from "../logger.js";

// A janela 7h-22h é horário de Brasília (cliente brasileiro). Como o worker
// pode rodar em qualquer timezone, extraímos a hora em São Paulo explicitamente
// em vez de usar o relógio local do servidor.
function getBrazilTime(date: Date): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)!.value, 10);
  return { hour: get("hour"), minute: get("minute"), second: get("second") };
}

function isWithinSendWindow(date = new Date()): boolean {
  const { hour } = getBrazilTime(date);
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}

function msUntilNextWindow(date = new Date()): number {
  if (isWithinSendWindow(date)) return 0;
  const { hour, minute, second } = getBrazilTime(date);
  const hoursAhead =
    hour >= SEND_WINDOW.endHour
      ? 24 - hour + SEND_WINDOW.startHour
      : SEND_WINDOW.startHour - hour;
  return hoursAhead * 3_600_000 - minute * 60_000 - second * 1_000;
}

function randomDelayMs(): number {
  const { min, max } = SEND_DELAY_MS;
  return Math.floor(min + Math.random() * (max - min));
}

const transporters = new Map<string, Transporter>();

function getTransporter(account: EmailAccount): Transporter {
  let t = transporters.get(account.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.smtpUser,
        pass: decryptSecret(account.smtpPassEnc),
      },
      pool: true,
      maxConnections: 1,
      rateLimit: 1,
    });
    transporters.set(account.id, t);
  }
  return t;
}

export function clearTransporterCache(accountId?: string) {
  if (accountId) {
    transporters.get(accountId)?.close();
    transporters.delete(accountId);
  } else {
    for (const t of transporters.values()) t.close();
    transporters.clear();
  }
}

const accountQueues = new Map<string, Promise<void>>();

export async function scheduleEmailSend(args: {
  accountId: string;
  conversationId: string;
  to: string;
  subject: string;
  body: string;
  senderType?: MessageSender;
  inReplyTo?: string;
  references?: string[];
}): Promise<void> {
  const { accountId, conversationId, to, subject, body, senderType = MessageSender.AI, inReplyTo, references } = args;

  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account || !account.isActive) {
    logger.warn({ accountId }, "EmailAccount inativa/inexistente — abortando");
    return;
  }

  // Persistir IMEDIATAMENTE (fora da fila). Isso garante que:
  // (a) a mensagem aparece no histórico na hora,
  // (b) próximos INBOUNDs do mesmo contato não ficam bloqueados atrás
  //     do delay/janela do envio anterior (que é o que causava
  //     "IA responde só a primeira mensagem").
  const stored = await prisma.message.create({
    data: {
      conversationId,
      direction: MessageDirection.OUTBOUND,
      sender: senderType,
      body,
      metadata: { subject, accountId, to },
    },
  });

  // A fila serializa só o envio SMTP de fato (janela 7h-22h + delay humano).
  const previous = accountQueues.get(accountId) ?? Promise.resolve();
  const next = previous.then(() =>
    dispatchStored(stored.id, account, { to, subject, body, inReplyTo, references })
  );
  accountQueues.set(accountId, next);
  next.catch((err) => logger.error({ err, accountId }, "Falha no envio de e-mail")).finally(() => {
    if (accountQueues.get(accountId) === next) accountQueues.delete(accountId);
  });
}

async function dispatchStored(
  messageId: string,
  account: EmailAccount,
  args: { to: string; subject: string; body: string; inReplyTo?: string; references?: string[] }
): Promise<void> {
  // Janela 7h-22h (horário de Brasília)
  const wait = msUntilNextWindow();
  if (wait > 0) {
    logger.info(
      { accountId: account.id, waitHours: (wait / 3_600_000).toFixed(1) },
      "⏰ E-mail fora da janela — aguardando"
    );
    await sleep(wait);
  }

  // Delay humano
  await sleep(randomDelayMs());

  try {
    const transporter = getTransporter(account);
    const info = await transporter.sendMail({
      from: { name: account.fromName, address: account.fromEmail },
      to: args.to,
      subject: args.subject,
      text: args.body,
      inReplyTo: args.inReplyTo,
      references: args.references,
    });

    await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: {
          subject: args.subject,
          accountId: account.id,
          to: args.to,
          messageId: info.messageId,
          envelope: info.envelope,
          response: info.response,
        },
      },
    });
    logger.info({ accountId: account.id, to: args.to, messageId: info.messageId }, "📧 E-mail enviado");
  } catch (err) {
    logger.error({ err, accountId: account.id, to: args.to }, "Falha no envio de e-mail");
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export { Channel };
