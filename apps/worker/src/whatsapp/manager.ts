import { prisma, WhatsAppStatus } from "@refidim/database";
import { logger } from "../logger.js";
import { isSessionActive, startSession } from "./service.js";

const POLL_INTERVAL_MS = 5000;

let pollHandle: NodeJS.Timeout | null = null;

/**
 * Inicia o loop que detecta sessões pendentes e (re)conecta:
 *  - status CONNECTING e sem socket ativo → startSession
 *  - status CONNECTED ou QR_PENDING e sem socket ativo (após restart do worker) → startSession
 */
export function startWhatsAppManager() {
  if (pollHandle) return;
  logger.info("🧭 WhatsApp manager iniciado");
  // tick imediato
  tick().catch((err) => logger.error({ err }, "Erro no tick inicial"));
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no tick"));
  }, POLL_INTERVAL_MS);
}

export function stopWhatsAppManager() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  const pending = await prisma.whatsAppSession.findMany({
    where: {
      status: {
        in: [
          WhatsAppStatus.CONNECTING,
          WhatsAppStatus.CONNECTED,
          WhatsAppStatus.QR_PENDING,
        ],
      },
    },
    select: { userId: true, status: true },
  });

  for (const sess of pending) {
    if (!isSessionActive(sess.userId)) {
      logger.info(
        { userId: sess.userId, status: sess.status },
        "Sessão pendente sem socket — iniciando"
      );
      startSession(sess.userId).catch((err) =>
        logger.error({ err, userId: sess.userId }, "Falha ao iniciar sessão")
      );
    }
  }
}
