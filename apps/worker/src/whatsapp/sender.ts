import { prisma, MessageDirection, MessageSender, Channel } from "@refidim/database";
import { SEND_DELAY_MS, SEND_WINDOW } from "@refidim/shared";
import { logger } from "../logger.js";
import { sendText, isSessionActive } from "./service.js";

/**
 * A janela 7h-22h é horário de Brasília. Extraímos a hora em São Paulo
 * explicitamente — não confiamos no relógio local do servidor (pode rodar
 * em qualquer timezone).
 */
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

export function isWithinSendWindow(date = new Date()): boolean {
  const { hour } = getBrazilTime(date);
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHour;
}

export function msUntilNextWindow(date = new Date()): number {
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

const userQueues = new Map<string, Promise<void>>();

/**
 * Enfileira um envio respeitando janela horária e delay humano.
 * Encadeia os envios POR USUÁRIO (um por vez) para simular um humano digitando.
 *
 * Persiste a mensagem outbound antes de enviar para garantir histórico mesmo se falhar.
 */
export async function scheduleWhatsAppSend(args: {
  userId: string;
  conversationId: string;
  to: string; // E.164 ou JID
  text: string;
  senderType?: MessageSender; // AI ou HUMAN
}): Promise<void> {
  const { userId } = args;
  const previous = userQueues.get(userId) ?? Promise.resolve();

  const next = previous.then(() => performSend(args));
  userQueues.set(userId, next);

  // Limpa quando termina, sem propagar erro pra próxima
  next.catch((err) => logger.error({ err, userId }, "Falha no envio WhatsApp")).finally(() => {
    if (userQueues.get(userId) === next) userQueues.delete(userId);
  });
}

async function performSend(args: {
  userId: string;
  conversationId: string;
  to: string;
  text: string;
  senderType?: MessageSender;
}): Promise<void> {
  const { userId, conversationId, to, text, senderType = MessageSender.AI } = args;

  // 1. Aguarda janela horária
  const waitForWindow = msUntilNextWindow();
  if (waitForWindow > 0) {
    logger.info(
      { userId, waitHours: (waitForWindow / 3_600_000).toFixed(1) },
      "⏰ Fora da janela 7h-22h — aguardando"
    );
    await sleep(waitForWindow);
  }

  // 2. Aguarda delay humano
  const delay = randomDelayMs();
  logger.debug({ userId, delaySec: Math.round(delay / 1000) }, "⏳ Delay humano");
  await sleep(delay);

  // 3. Confirma que sessão segue ativa
  if (!isSessionActive(userId)) {
    logger.warn({ userId }, "Sessão inativa — descartando envio");
    return;
  }

  // 4. Persiste outbound antes do envio
  const stored = await prisma.message.create({
    data: {
      conversationId,
      direction: MessageDirection.OUTBOUND,
      sender: senderType,
      body: text,
    },
  });

  // 5. Envia
  try {
    const result = await sendText(userId, to, text);
    if (result?.messageId) {
      await prisma.message.update({
        where: { id: stored.id },
        data: {
          metadata: { messageId: result.messageId, sentAt: new Date().toISOString() },
        },
      });
    }
    logger.info({ userId, to, msgId: result?.messageId }, "✉️  Mensagem enviada");
  } catch (err) {
    logger.error({ err, userId, to }, "Falha no envio — mensagem ficará marcada");
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
