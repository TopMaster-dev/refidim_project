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

function isWithinSendWindow(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}

function msUntilNextWindow(date = new Date()): number {
  if (isWithinSendWindow(date)) return 0;
  const next = new Date(date);
  if (date.getHours() >= SEND_WINDOW.endHour) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(SEND_WINDOW.startHour, 0, 0, 0);
  return next.getTime() - date.getTime();
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
  const { accountId } = args;
  const previous = accountQueues.get(accountId) ?? Promise.resolve();
  const next = previous.then(() => performSend(args));
  accountQueues.set(accountId, next);
  next.catch((err) => logger.error({ err, accountId }, "Falha no envio de e-mail")).finally(() => {
    if (accountQueues.get(accountId) === next) accountQueues.delete(accountId);
  });
}

async function performSend(args: {
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

  // Janela 7h-22h
  const wait = msUntilNextWindow();
  if (wait > 0) {
    logger.info({ accountId, waitHours: (wait / 3_600_000).toFixed(1) }, "⏰ E-mail fora da janela — aguardando");
    await sleep(wait);
  }

  // Delay humano
  const delay = randomDelayMs();
  await sleep(delay);

  const stored = await prisma.message.create({
    data: {
      conversationId,
      direction: MessageDirection.OUTBOUND,
      sender: senderType,
      body,
      metadata: { subject, accountId, to },
    },
  });

  try {
    const transporter = getTransporter(account);
    const info = await transporter.sendMail({
      from: { name: account.fromName, address: account.fromEmail },
      to,
      subject,
      text: body,
      inReplyTo,
      references,
    });

    await prisma.message.update({
      where: { id: stored.id },
      data: {
        metadata: {
          subject,
          accountId,
          to,
          messageId: info.messageId,
          envelope: info.envelope,
          response: info.response,
        },
      },
    });
    logger.info({ accountId, to, messageId: info.messageId }, "📧 E-mail enviado");
  } catch (err) {
    logger.error({ err, accountId, to }, "Falha no envio de e-mail");
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export { Channel };
