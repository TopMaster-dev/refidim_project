import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "./logger.js";

let redisConnection: IORedis | null = null;
let redisAvailable = false;

export const QUEUE_NAMES = {
  WHATSAPP_SEND: "whatsapp:send",
  EMAIL_SEND: "email:send",
  AI_REPLY: "ai:reply",
  AI_CLASSIFY: "ai:classify",
  EXTRACTION: "extraction:google",
} as const;

const queues = new Map<string, Queue>();

/**
 * Tenta conectar ao Redis. Se falhar, marca como indisponível
 * e o resto do worker continua rodando (com features de fila degradadas).
 */
export async function initRedis(): Promise<boolean> {
  const host = process.env.REDIS_HOST ?? "localhost";
  const port = Number(process.env.REDIS_PORT ?? 6379);

  try {
    const conn = new IORedis({
      host,
      port,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 3000,
      retryStrategy: () => null,
    });

    // Auditoria 28/05: handler vazio escondia reconnect storms — em horas/dias
    // de uso, ioredis podia entrar em loop de reconexão silencioso, abrindo FDs.
    // Throttle: loga no máximo 1 erro a cada 30s pra não inundar.
    let lastErrLog = 0;
    conn.on("error", (err: Error) => {
      const now = Date.now();
      if (now - lastErrLog > 30_000) {
        lastErrLog = now;
        logger.warn({ err: err.message, code: (err as { code?: string }).code }, "Redis error (throttled)");
      }
    });

    await conn.connect();
    await conn.ping();
    redisConnection = conn;
    redisAvailable = true;
    logger.info({ host, port }, "✅ Redis connected");
    return true;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, host, port },
      "⚠️  Redis indisponível — filas BullMQ desabilitadas. WhatsApp/Email funcionarão com scheduler in-process."
    );
    redisAvailable = false;
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getQueue(name: keyof typeof QUEUE_NAMES): Queue | null {
  if (!redisAvailable || !redisConnection) return null;
  const qName = QUEUE_NAMES[name];
  let q = queues.get(qName);
  if (!q) {
    q = new Queue(qName, { connection: redisConnection });
    queues.set(qName, q);
  }
  return q;
}

export async function shutdownRedis() {
  for (const q of queues.values()) {
    await q.close();
  }
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
