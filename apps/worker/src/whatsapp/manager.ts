import { prisma, WhatsAppStatus } from "@refidim/database";
import { logger } from "../logger.js";
import { isSessionActive, startSession, stopSession } from "./service.js";

const POLL_INTERVAL_MS = 5000;

let pollHandle: NodeJS.Timeout | null = null;

/**
 * Loop que detecta sessões pendentes e (re)conecta.
 * Lida com 3 casos:
 *
 * 1. status CONNECTING/CONNECTED/QR_PENDING + sem socket → startSession
 *    (cobre primeira conexão e auto-recover após restart do worker)
 *
 * 2. status CONNECTING + authState NULL + COM socket → trocar de número
 *    Mata socket antigo e na próxima iteração reinicia com auth vazio (gera QR novo)
 *
 * 3. status DISCONNECTED + COM socket → cliente pediu pra parar
 *    Mata o socket pra liberar
 */
export function startWhatsAppManager() {
  if (pollHandle) return;
  logger.info("🧭 WhatsApp manager iniciado");
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

// Tempo mínimo desde a última atualização antes de reiniciar uma sessão
// CONNECTED sem socket. 5s é suficiente pra evitar race com close handler
// (que costuma terminar em ms). Antes era 30s, o que deixava trabalhos sem
// dispararem por até 30s após restart do worker.
const CONNECTED_RESTART_MIN_AGE_MS = 5_000;

async function tick() {
  const all = await prisma.whatsAppSession.findMany({
    select: {
      userId: true,
      status: true,
      authState: true,
      updatedAt: true,
    },
  });

  for (const sess of all) {
    const active = isSessionActive(sess.userId);
    const hasAuthInDb = !!sess.authState;

    // Caso 2: trocar de número (limpou authState mas socket existe)
    if (
      sess.status === WhatsAppStatus.CONNECTING &&
      !hasAuthInDb &&
      active
    ) {
      logger.info(
        { userId: sess.userId },
        "🔄 Trocar número detectado — encerrando socket antigo"
      );
      await stopSession(sess.userId, false);
      continue;
    }

    // Caso 3: status DISCONNECTED mas socket vivo — fecha o socket
    if (sess.status === WhatsAppStatus.DISCONNECTED && active) {
      logger.info({ userId: sess.userId }, "Status DISCONNECTED — fechando socket");
      await stopSession(sess.userId, false);
      continue;
    }

    // Caso 1: pendente e sem socket → iniciar
    // CONNECTING e QR_PENDING são sempre estados ativos (acabaram de ser definidos
    // pela UI ou pelo Baileys). CONNECTED só restart se for "antigo" (worker
    // reiniciou). Isso evita race com close handler async.
    const isRecent =
      Date.now() - sess.updatedAt.getTime() < CONNECTED_RESTART_MIN_AGE_MS;

    const shouldStart =
      !active &&
      ((sess.status === WhatsAppStatus.CONNECTING) ||
        (sess.status === WhatsAppStatus.QR_PENDING) ||
        (sess.status === WhatsAppStatus.CONNECTED && !isRecent));

    if (shouldStart) {
      logger.info(
        {
          userId: sess.userId,
          status: sess.status,
          hasAuth: hasAuthInDb,
          ageMs: Date.now() - sess.updatedAt.getTime(),
        },
        "Sessão pendente sem socket — iniciando"
      );
      startSession(sess.userId).catch((err) =>
        logger.error({ err, userId: sess.userId }, "Falha ao iniciar sessão")
      );
    }
  }
}
