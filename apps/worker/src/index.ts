import "dotenv/config";
import { prisma } from "@refidim/database";
import { logger } from "./logger.js";
import { initRedis, shutdownRedis } from "./queues.js";
import { startWhatsAppManager, stopWhatsAppManager } from "./whatsapp/manager.js";
import { shutdownAllSessions } from "./whatsapp/service.js";
import { startEmailManager, stopEmailManager } from "./email/manager.js";
import { startOpeningDispatcher, stopOpeningDispatcher } from "./ai/opener.js";
import { hasAIProvider } from "./ai/provider.js";
import { startHumanDispatcher, stopHumanDispatcher } from "./human-dispatcher.js";
import { startExtractor, stopExtractor } from "./extractor/google-places.js";
import { startReplyRecovery, stopReplyRecovery } from "./ai/reply-recovery.js";

// Sem esses handlers, qualquer Promise rejected não-capturada matava o worker
// silenciosamente. Auditoria 28/05 identificou várias fontes potenciais
// (saveCreds, scheduleEmailSend, etc) onde rejections podiam escapar.
process.on("uncaughtException", (err) => {
  logger.error({ err }, "⚠️ uncaughtException — worker continuando, mas isso é bug");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason: String(reason) }, "⚠️ unhandledRejection — worker continuando");
});

async function bootstrap() {
  logger.info("🚀 Refidim worker iniciando...");

  // Redis é opcional — se não disponível, filas BullMQ ficam off
  await initRedis();

  // WhatsApp manager: detecta sessões pendentes e reconecta
  startWhatsAppManager();

  // Email manager: cuida das contas SMTP/IMAP ativas
  startEmailManager();

  // Opening dispatcher: para trabalhos RUNNING, gera primeiras abordagens
  if (hasAIProvider()) {
    startOpeningDispatcher();
    // Safety-net: garante resposta a leads que ficaram sem reply em 40-80s
    startReplyRecovery();
  } else {
    logger.warn("⚠️  AI_PROVIDER sem chave configurada — IA desativada (configure ANTHROPIC_API_KEY ou OPENAI_API_KEY)");
  }

  // Human dispatcher: envia mensagens digitadas no painel
  startHumanDispatcher();

  // Extrator: processa ExtractionJobs na fila
  startExtractor();
  // TODO Fase 9: registrar worker de extrator (Playwright)

  logger.info("✅ Refidim worker pronto.");
}

bootstrap().catch((err) => {
  logger.error({ err }, "Worker falhou ao iniciar");
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "🛑 Encerrando worker...");
  stopWhatsAppManager();
  await shutdownAllSessions();
  await stopEmailManager();
  stopOpeningDispatcher();
  stopReplyRecovery();
  stopHumanDispatcher();
  stopExtractor();
  await shutdownRedis();
  // Auditoria 28/05: Prisma não tinha shutdown limpo → connections ficavam
  // pendentes no Postgres ao restart, comendo do pool em deploys/restarts.
  try {
    await prisma.$disconnect();
  } catch (err) {
    logger.warn({ err }, "Erro ao desconectar Prisma (ignorando)");
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
