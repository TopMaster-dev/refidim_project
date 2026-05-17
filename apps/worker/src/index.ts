import { logger } from "./logger.js";
import { redisConnection } from "./queues.js";

async function bootstrap() {
  logger.info("Refidim worker starting...");

  // Verifica conexão Redis
  await redisConnection.ping();
  logger.info("✅ Redis connected");

  // TODO Fase 4: registrar workers de WhatsApp (Baileys)
  // TODO Fase 5: registrar workers de e-mail (SMTP/IMAP)
  // TODO Fase 6: registrar workers de IA (resposta + classificação)
  // TODO Fase 9: registrar worker de extrator (Playwright)

  logger.info("Refidim worker ready. Awaiting jobs.");
}

bootstrap().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down worker...");
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
