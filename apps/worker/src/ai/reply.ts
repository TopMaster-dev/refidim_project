import {
  prisma,
  AlertKind,
  Channel,
  LeadStatus,
  MessageSender,
} from "@refidim/database";
import { logger } from "../logger.js";
import { hasAIProvider, getAIProvider, type ChatMessage } from "./provider.js";
import { buildSystemPrompt } from "./prompt.js";
import { classifyLead } from "./classifier.js";
import { scheduleWhatsAppSend } from "../whatsapp/sender.js";
import { scheduleEmailSend } from "../email/sender.js";

/**
 * Gera e dispara resposta da IA para uma conversa,
 * depois classifica o lead e gera alerta se necessário.
 *
 * Idempotência: caller garante que essa função roda apenas uma vez por mensagem inbound.
 */
export async function generateAndSendReply(conversationId: string): Promise<void> {
  if (!hasAIProvider()) {
    logger.warn({ conversationId }, "IA não configurada — pulando reply");
    return;
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: {
        include: {
          contact: true,
          job: {
            include: {
              consultant: {
                include: {
                  context: true,
                  permissions: true,
                  materials: { where: { isActive: true } },
                },
              },
            },
          },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        take: 50,
      },
    },
  });

  if (!conversation) {
    logger.warn({ conversationId }, "Conversation não encontrada");
    return;
  }

  // Não responde se humano assumiu ou opt-out
  if (conversation.isPaused) {
    logger.info({ conversationId }, "Conversa pausada — humano assumiu");
    return;
  }
  if (conversation.lead.status === LeadStatus.HANDED_OFF) return;
  if (conversation.lead.status === LeadStatus.OPTED_OUT) return;

  const { lead } = conversation;
  const { consultant } = lead.job;

  // Monta histórico (limite 30 últimas msgs)
  const history: ChatMessage[] = conversation.messages.slice(-30).map((m) => ({
    role: m.sender === MessageSender.CONTACT ? ("user" as const) : ("assistant" as const),
    content: m.body,
  }));

  // Se a última msg é do CONTACT, gera reply
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (!lastMessage || lastMessage.sender !== MessageSender.CONTACT) {
    logger.info({ conversationId }, "Última msg não é do contato — pulando reply");
    return;
  }

  const systemPrompt = buildSystemPrompt({
    consultant,
    context: consultant.context,
    permissions: consultant.permissions,
    materials: consultant.materials,
    job: lead.job,
    contactName: lead.contact.name,
  });

  let aiResponse: string;
  try {
    aiResponse = await getAIProvider().chat({
      system: systemPrompt,
      messages: history,
      maxTokens: 400,
    });
  } catch (err) {
    logger.error({ err, conversationId }, "Falha ao gerar resposta IA");
    return;
  }

  if (!aiResponse) {
    logger.warn({ conversationId }, "IA retornou resposta vazia");
    return;
  }

  // Despacha conforme canal
  if (conversation.channel === Channel.WHATSAPP) {
    if (!lead.contact.phone) {
      logger.warn({ leadId: lead.id }, "Contato sem telefone — não pode enviar WhatsApp");
      return;
    }
    await scheduleWhatsAppSend({
      userId: lead.job.userId,
      conversationId,
      to: lead.contact.phone,
      text: aiResponse,
      senderType: MessageSender.AI,
    });
  } else if (conversation.channel === Channel.EMAIL) {
    if (!lead.contact.email) {
      logger.warn({ leadId: lead.id }, "Contato sem e-mail — não pode enviar e-mail");
      return;
    }
    // Encontra EmailAccount: do consultor ou da empresa
    const account = await prisma.emailAccount.findFirst({
      where: {
        userId: lead.job.userId,
        isActive: true,
        OR: [{ consultantId: consultant.id }, { consultantId: null }],
      },
      orderBy: { consultantId: { sort: "desc", nulls: "last" } },
    });
    if (!account) {
      logger.warn({ leadId: lead.id }, "Sem EmailAccount ativa para o consultor");
      return;
    }
    const subject = inferReplySubject(conversation.messages);
    await scheduleEmailSend({
      accountId: account.id,
      conversationId,
      to: lead.contact.email,
      subject,
      body: aiResponse,
      senderType: MessageSender.AI,
    });
  }

  // Classifica e gera alerta (com a resposta da IA + histórico)
  await classifyAndAlert({
    conversationId,
    leadId: lead.id,
    userId: lead.job.userId,
    history: [...history, { role: "assistant", content: aiResponse }],
  });
}

/**
 * Classifica o lead após troca e cria Alert se preciso.
 */
async function classifyAndAlert(args: {
  conversationId: string;
  leadId: string;
  userId: string;
  history: ChatMessage[];
}): Promise<void> {
  try {
    const result = await classifyLead(args.history);

    const newStatus: LeadStatus =
      result.status === "HOT"
        ? LeadStatus.HOT
        : result.status === "WARM"
          ? LeadStatus.WARM
          : LeadStatus.COLD;

    await prisma.lead.update({
      where: { id: args.leadId },
      data: { status: newStatus, notes: result.reason },
    });

    // Regra do cliente: quando lead vira HOT, a IA PARA de responder e aguarda
    // o humano clicar "Assumir conversa". Sem isso a IA continuava conversando
    // depois do lead já estar pronto pra fechar — interferindo na venda.
    if (result.status === "HOT") {
      await prisma.conversation.update({
        where: { id: args.conversationId },
        data: { isPaused: true },
      });

      // Garante alerta mesmo se a IA não tiver flagado triggerHumanAlert
      await prisma.alert.create({
        data: {
          userId: args.userId,
          leadId: args.leadId,
          kind: AlertKind.LEAD_HOT,
          message: result.alertReason ?? result.reason ?? "Lead pronto para o time comercial assumir",
        },
      });
      logger.info({ leadId: args.leadId }, "🚨 Lead HOT — conversa pausada, aguardando humano");
    } else if (result.triggerHumanAlert) {
      await prisma.alert.create({
        data: {
          userId: args.userId,
          leadId: args.leadId,
          kind: AlertKind.LEAD_HOT,
          message: result.alertReason ?? result.reason,
        },
      });
      logger.info({ leadId: args.leadId, reason: result.alertReason }, "🚨 Alerta de lead criado");
    }

    logger.info({ leadId: args.leadId, status: result.status }, "Lead classificado");
  } catch (err) {
    logger.error({ err, leadId: args.leadId }, "Falha na classificação");
  }
}

function inferReplySubject(messages: Array<{ metadata: unknown; direction: string }>): string {
  // Tenta extrair subject da última msg inbound
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.direction === "INBOUND") {
      const meta = m.metadata as { subject?: string } | null;
      if (meta?.subject) {
        return meta.subject.startsWith("Re:") ? meta.subject : `Re: ${meta.subject}`;
      }
    }
  }
  return "Continuação";
}
