import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

// Filas — uma por tipo de trabalho assíncrono
export const QUEUE_NAMES = {
  WHATSAPP_SEND: "whatsapp:send",
  EMAIL_SEND: "email:send",
  AI_REPLY: "ai:reply",
  AI_CLASSIFY: "ai:classify",
  EXTRACTION: "extraction:google",
} as const;

export const whatsAppSendQueue = new Queue(QUEUE_NAMES.WHATSAPP_SEND, {
  connection: redisConnection,
});

export const emailSendQueue = new Queue(QUEUE_NAMES.EMAIL_SEND, {
  connection: redisConnection,
});

export const aiReplyQueue = new Queue(QUEUE_NAMES.AI_REPLY, {
  connection: redisConnection,
});

export const aiClassifyQueue = new Queue(QUEUE_NAMES.AI_CLASSIFY, {
  connection: redisConnection,
});

export const extractionQueue = new Queue(QUEUE_NAMES.EXTRACTION, {
  connection: redisConnection,
});
