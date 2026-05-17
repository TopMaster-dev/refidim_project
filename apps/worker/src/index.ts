import "dotenv/config";
import { logger } from "./logger.js";
import { initRedis, shutdownRedis } from "./queues.js";
import { startWhatsAppManager, stopWhatsAppManager } from "./whatsapp/manager.js";
import { shutdownAllSessions } from "./whatsapp/service.js";
import { startEmailManager, stopEmailManager } from "./email/manager.js";
import { startOpeningDispatcher, stopOpeningDispatcher } from "./ai/opener.js";
import { hasAIProvider } from "./ai/provider.js";

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
  } else {
    logger.warn("⚠️  AI_PROVIDER sem chave configurada — IA desativada (configure ANTHROPIC_API_KEY ou OPENAI_API_KEY)");
  }
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
  await shutdownRedis();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
