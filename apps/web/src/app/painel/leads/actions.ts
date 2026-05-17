"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, LeadStatus, MessageDirection, MessageSender } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Pausa a IA na conversa e marca o lead como HANDED_OFF.
 */
export async function handOffLeadAction(leadId: string) {
  const user = await requireUser();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, job: { userId: user.id } },
    include: { conversation: true },
  });
  if (!lead) return { error: "Lead não encontrado" };

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.HANDED_OFF, handedOffAt: new Date() },
    }),
    ...(lead.conversation
      ? [
          prisma.conversation.update({
            where: { id: lead.conversation.id },
            data: { isPaused: true },
          }),
        ]
      : []),
  ]);

  // Marca alertas relacionados como lidos
  await prisma.alert.updateMany({
    where: { leadId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath(`/painel/leads/${leadId}`);
  revalidatePath("/painel/leads");
}

/**
 * Reativa a IA: devolve para WARM (ou COLD se não houver msgs) e despausa conversa.
 */
export async function returnLeadToAIAction(leadId: string) {
  const user = await requireUser();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, job: { userId: user.id } },
    include: { conversation: { include: { _count: { select: { messages: true } } } } },
  });
  if (!lead || !lead.conversation) return;

  const hasMessages = lead.conversation._count.messages > 0;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        status: hasMessages ? LeadStatus.WARM : LeadStatus.COLD,
        handedOffAt: null,
      },
    }),
    prisma.conversation.update({
      where: { id: lead.conversation.id },
      data: { isPaused: false },
    }),
  ]);

  revalidatePath(`/painel/leads/${leadId}`);
}

/**
 * Humano envia uma mensagem pelo painel.
 * - Persiste como OUTBOUND/HUMAN
 * - (TODO) chamar API do worker para fazer o envio real via WhatsApp/E-mail
 *
 * Por enquanto persiste e marca para envio; o disparo real pelo worker
 * acontece quando lermos `pendingHumanSend` em fila própria (Fase 7.1).
 */
export async function sendHumanMessageAction(formData: FormData) {
  const user = await requireUser();

  const leadId = String(formData.get("leadId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!leadId || text.length < 1) return { error: "Mensagem vazia" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, job: { userId: user.id } },
    include: { conversation: true },
  });
  if (!lead || !lead.conversation) return { error: "Conversa não encontrada" };

  await prisma.message.create({
    data: {
      conversationId: lead.conversation.id,
      direction: MessageDirection.OUTBOUND,
      sender: MessageSender.HUMAN,
      body: text,
      metadata: { source: "panel", pendingDispatch: true },
    },
  });

  // TODO: notificar worker para enviar — por enquanto fica registrado no histórico.
  // No próximo passo, o worker terá um poll que despacha pendingDispatch=true.

  revalidatePath(`/painel/leads/${leadId}`);
  return { ok: true };
}

export async function markAlertReadAction(alertId: string) {
  const user = await requireUser();
  await prisma.alert.updateMany({
    where: { id: alertId, userId: user.id },
    data: { isRead: true },
  });
  revalidatePath("/painel/leads");
}
