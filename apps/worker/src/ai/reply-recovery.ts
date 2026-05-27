import {
  prisma,
  MessageDirection,
  MessageSender,
  LeadStatus,
} from "@refidim/database";
import { logger } from "../logger.js";
import { generateAndSendReply } from "./reply.js";
import { hasAIProvider } from "./provider.js";

/**
 * Safety-net de resposta.
 *
 * Cenário (reportado pelo cliente): "lead respondeu e a IA não respondeu de volta".
 * Normalmente o reply é disparado no inbound com delay de 5-20s. Mas se isso
 * falhar (worker reiniciou, erro de IA, fila travada), o lead fica sem resposta.
 *
 * Este dispatcher roda a cada 20s e procura conversas onde:
 *   - a ÚLTIMA mensagem é INBOUND do contato
 *   - tem entre 40s e 1h de idade (passou da janela normal de 5-20s, mas não é antiga)
 *   - a conversa NÃO está pausada
 *   - o lead NÃO está HANDED_OFF nem OPTED_OUT
 *
 * Para essas, força generateAndSendReply. Garante que todo lead recebe resposta
 * em no máximo ~40-80s mesmo se o caminho normal falhou.
 */

const POLL_INTERVAL_MS = 20_000;
const MIN_AGE_MS = 40_000; // só age se passou de 40s sem resposta
const MAX_AGE_MS = 60 * 60 * 1000; // ignora conversas paradas há mais de 1h

let pollHandle: NodeJS.Timeout | null = null;

// Evita re-disparar a mesma conversa em ticks consecutivos enquanto o reply
// ainda está sendo gerado/enfileirado.
const recentlyRecovered = new Map<string, number>();
const RECOVER_COOLDOWN_MS = 2 * 60 * 1000;

export function startReplyRecovery() {
  if (pollHandle) return;
  logger.info("🛟 Reply recovery (safety-net 40-80s) iniciado");
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no reply-recovery"));
  }, POLL_INTERVAL_MS);
}

export function stopReplyRecovery() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  if (!hasAIProvider()) return;

  const now = Date.now();
  const minTime = new Date(now - MAX_AGE_MS);
  const maxTime = new Date(now - MIN_AGE_MS);

  // Conversas ativas com pelo menos uma mensagem inbound recente
  const candidates = await prisma.conversation.findMany({
    where: {
      isPaused: false,
      lead: {
        status: { notIn: [LeadStatus.HANDED_OFF, LeadStatus.OPTED_OUT] },
      },
      messages: {
        some: {
          direction: MessageDirection.INBOUND,
          sender: MessageSender.CONTACT,
          sentAt: { gte: minTime, lte: maxTime },
        },
      },
    },
    select: {
      id: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { direction: true, sender: true, sentAt: true, metadata: true },
      },
    },
    take: 50,
  });

  for (const conv of candidates) {
    const last = conv.messages[0];
    if (!last) continue;

    // A última mensagem precisa ser INBOUND do contato (= sem resposta nossa depois)
    if (last.direction !== MessageDirection.INBOUND || last.sender !== MessageSender.CONTACT) {
      continue;
    }

    const age = now - new Date(last.sentAt).getTime();
    if (age < MIN_AGE_MS || age > MAX_AGE_MS) continue;

    // Ignora se essa última mensagem é de bot suspeito (esse fluxo é tratado à parte)
    const meta = (last.metadata ?? {}) as Record<string, unknown>;
    if (meta.suspectedBot === true) continue;

    // Cooldown anti-duplicata
    const lastRecover = recentlyRecovered.get(conv.id);
    if (lastRecover && now - lastRecover < RECOVER_COOLDOWN_MS) continue;
    recentlyRecovered.set(conv.id, now);

    logger.warn(
      { conversationId: conv.id, ageSec: Math.round(age / 1000) },
      "🛟 Lead sem resposta — forçando reply (safety-net)"
    );
    generateAndSendReply(conv.id).catch((err) =>
      logger.error({ err, conversationId: conv.id }, "Erro no reply forçado")
    );
  }

  // Limpa cooldown antigo pra não vazar memória
  for (const [id, ts] of recentlyRecovered) {
    if (now - ts > RECOVER_COOLDOWN_MS) recentlyRecovered.delete(id);
  }
}
