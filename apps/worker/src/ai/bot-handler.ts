import { prisma, AlertKind, MessageDirection, MessageSender } from "@refidim/database";
import { logger } from "../logger.js";

/**
 * Tratamento quando recebemos uma mensagem que parece de bot.
 *
 * Estratégia:
 *  - 1ª detecção: registra mas NÃO pausa — pode ser falso positivo. A IA
 *    continua tentando com prompt mais humano.
 *  - 2ª detecção consecutiva: pausa a conversa, marca o lead como
 *    "atendido por automação" (notes), cria alerta para o humano.
 *
 * A contagem é derivada das mensagens — olhamos as últimas N INBOUND e
 * vemos quantas seguidas têm `metadata.suspectedBot === true`. Sem schema
 * extra, sem campo em Conversation.
 */
export async function handleSuspectedBot(args: {
  conversationId: string;
  leadId: string;
  userId: string;
  reason: string;
}): Promise<{ shouldPause: boolean }> {
  // Conta INBOUND mais recentes (já inclui a que acabou de chegar)
  const recent = await prisma.message.findMany({
    where: {
      conversationId: args.conversationId,
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
    },
    orderBy: { sentAt: "desc" },
    take: 5,
    select: { metadata: true },
  });

  let consecutive = 0;
  for (const m of recent) {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    if (meta.suspectedBot === true) consecutive++;
    else break; // quebra na primeira mensagem normal
  }

  if (consecutive >= 2) {
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: args.conversationId },
        data: { isPaused: true },
      }),
      prisma.lead.update({
        where: { id: args.leadId },
        data: { notes: `Conversa parece atendida por automação (${args.reason}). IA pausada.` },
      }),
      prisma.alert.create({
        data: {
          userId: args.userId,
          leadId: args.leadId,
          kind: AlertKind.LEAD_HOT,
          message: `Possível autoresponder detectado. Conversa pausada após ${consecutive} mensagens automáticas. Razão: ${args.reason}`,
        },
      }),
    ]);
    logger.info(
      { leadId: args.leadId, consecutive },
      "🤖 Lead com 2+ respostas automáticas — IA pausada"
    );
    return { shouldPause: true };
  }

  return { shouldPause: false };
}

/**
 * No fluxo atual, quando uma mensagem NÃO parece bot, ela é persistida com
 * `metadata.suspectedBot=false` — o que naturalmente quebra a contagem
 * de consecutivos na próxima chamada de `handleSuspectedBot`. Por isso essa
 * função é um no-op mantido pra clareza de chamada nos handlers de inbound.
 */
export async function resetBotStreak(_conversationId: string): Promise<void> {
  // intencionalmente vazio — a quebra acontece pela própria mensagem nova
  return;
}
