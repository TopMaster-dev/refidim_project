import type { WASocket, proto } from "@whiskeysockets/baileys";
import { prisma, Channel, MessageDirection, MessageSender, LeadStatus } from "@refidim/database";
import { OPT_OUT_KEYWORDS, OPT_OUT_NOTICE } from "@refidim/shared";
import { logger } from "../logger.js";

/**
 * Processa uma mensagem recebida via WhatsApp.
 * - Ignora msgs próprias e de grupo
 * - Localiza Lead ativo pelo número
 * - Persiste Message
 * - Detecta opt-out
 * - (Fase 6) Enfileira resposta da IA
 */
export async function handleIncomingMessage(
  userId: string,
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> {
  if (!msg.key) return;
  // Ignora própria
  if (msg.key.fromMe) return;

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;

  // Ignora grupos e broadcast
  if (remoteJid.endsWith("@g.us") || remoteJid.includes("broadcast")) return;

  // Extrai número
  const phoneRaw = remoteJid.split("@")[0]?.split(":")[0];
  if (!phoneRaw) return;
  const phoneE164 = `+${phoneRaw}`;

  // Extrai texto
  const text = extractText(msg);
  if (!text) return;

  logger.info({ userId, phone: phoneE164, preview: text.slice(0, 80) }, "📨 Mensagem recebida");

  // Localiza Contact + Lead ativo do usuário
  const contact = await prisma.contact.findFirst({
    where: {
      phone: phoneE164,
      contactList: { userId },
    },
    include: {
      leads: {
        where: {
          status: { notIn: [LeadStatus.OPTED_OUT, LeadStatus.HANDED_OFF] },
          job: { userId },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { conversation: true, job: true },
      },
    },
  });

  if (!contact || contact.leads.length === 0) {
    logger.info({ userId, phone: phoneE164 }, "Mensagem de número não cadastrado — ignorando");
    return;
  }

  const lead = contact.leads[0]!;

  // Garante Conversation
  const conversation = lead.conversation ??
    (await prisma.conversation.create({
      data: {
        leadId: lead.id,
        channel: Channel.WHATSAPP,
        externalId: remoteJid,
      },
    }));

  // Persiste a mensagem
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
      body: text,
      metadata: {
        messageId: msg.key?.id ?? null,
        timestamp: msg.messageTimestamp?.toString() ?? null,
        remoteJid,
      },
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastMessageAt: new Date() },
  });

  // Detecta opt-out
  if (isOptOut(text)) {
    await handleOptOut(lead.id, contact.id, sock, remoteJid);
    return;
  }

  // (Fase 6) Aqui virá: enfileirar AI_REPLY
  logger.info({ leadId: lead.id }, "Mensagem armazenada — aguardando IA (Fase 6)");
}

function extractText(msg: proto.IWebMessageInfo): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    null
  );
}

function isOptOut(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return OPT_OUT_KEYWORDS.some((kw) => normalized === kw || normalized.includes(kw));
}

async function handleOptOut(
  leadId: string,
  contactId: string,
  sock: WASocket,
  jid: string
) {
  // Marca lead e contato
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.OPTED_OUT, handedOffAt: null },
    }),
    prisma.contact.update({
      where: { id: contactId },
      data: { isOptedOut: true },
    }),
  ]);

  // Envia confirmação educada e PARA
  try {
    await sock.sendMessage(jid, {
      text: "Sem problema, vou parar por aqui. Bom dia!",
    });
  } catch (err) {
    logger.warn({ err, leadId }, "Falha ao enviar confirmação de opt-out");
  }

  logger.info({ leadId, contactId }, "🚫 Lead optou por sair");
}
