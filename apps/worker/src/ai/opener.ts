import {
  prisma,
  Channel,
  JobStatus,
  LeadStatus,
  MessageDirection,
  MessageSender,
} from "@refidim/database";
import { logger } from "../logger.js";
import { hasAIProvider, getAIProvider } from "./provider.js";
import { buildSystemPrompt } from "./prompt.js";
import { isSessionActive } from "../whatsapp/service.js";
import { scheduleWhatsAppSend } from "../whatsapp/sender.js";
import { scheduleEmailSend } from "../email/sender.js";

const POLL_INTERVAL_MS = 15_000; // 15s — pega leads novos rápido, dá sensação de "ao vivo"
const BATCH_PER_TICK = 5; // até 5 aberturas por tick por trabalho

let pollHandle: NodeJS.Timeout | null = null;

export function startOpeningDispatcher() {
  if (pollHandle) return;
  logger.info("🎯 Opening dispatcher iniciado");
  tick().catch((err) => logger.error({ err }, "Erro no tick inicial do opener"));
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no tick do opener"));
  }, POLL_INTERVAL_MS);
}

export function stopOpeningDispatcher() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  if (!hasAIProvider()) return;

  const runningJobs = await prisma.job.findMany({
    where: { status: JobStatus.RUNNING },
    include: {
      consultant: {
        include: {
          context: true,
          permissions: true,
          materials: { where: { isActive: true } },
          openings: { where: { isActive: true } },
        },
      },
    },
  });

  for (const job of runningJobs) {
    try {
      await processJobOpenings(job);
    } catch (err) {
      logger.error({ err, jobId: job.id }, "Erro processando aberturas");
    }
  }
}

async function processJobOpenings(
  job: Awaited<ReturnType<typeof prisma.job.findMany>>[number] & {
    consultant: {
      openings: Array<{ id: string; text: string; label: string }>;
      context: unknown;
      permissions: unknown;
      materials: unknown[];
    };
  }
): Promise<void> {
  // Limite diário: conta envios outbound nas últimas 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentToday = await prisma.message.count({
    where: {
      direction: MessageDirection.OUTBOUND,
      conversation: {
        lead: { jobId: job.id },
      },
      sentAt: { gte: since24h },
    },
  });

  if (sentToday >= job.dailyLimit) {
    logger.info({ jobId: job.id, sentToday }, "Limite diário atingido");
    return;
  }

  const remaining = Math.min(BATCH_PER_TICK, job.dailyLimit - sentToday);

  // WhatsApp precisa de sessão ativa
  if (job.channel === Channel.WHATSAPP && !isSessionActive(job.userId)) {
    return;
  }

  // EmailAccount precisa estar ativa
  if (job.channel === Channel.EMAIL) {
    const acc = await prisma.emailAccount.findFirst({
      where: { userId: job.userId, isActive: true },
    });
    if (!acc) return;
  }

  // Leads sem conversation ainda (= primeira mensagem) e não opt-out
  const newLeads = await prisma.lead.findMany({
    where: {
      jobId: job.id,
      status: LeadStatus.COLD,
      conversation: null,
      contact: { isOptedOut: false },
    },
    include: { contact: true },
    take: remaining,
  });

  if (newLeads.length === 0) return;

  // Filtra leads sem contato adequado pro canal
  const eligible = newLeads.filter((l) =>
    job.channel === Channel.WHATSAPP ? !!l.contact.phone : !!l.contact.email
  );

  for (const lead of eligible) {
    await dispatchOpening(job, lead).catch((err) =>
      logger.error({ err, leadId: lead.id }, "Falha ao disparar abertura")
    );
  }
}

async function dispatchOpening(
  job: { id: string; userId: string; channel: string; goal: string; consultant: any },
  lead: {
    id: string;
    contactId: string;
    contact: {
      name: string | null;
      phone: string | null;
      email: string | null;
      company?: string | null;
      metadata?: unknown;
    };
  }
): Promise<void> {
  // Escolhe uma abertura aleatória dentre as ativas
  const openings = (job.consultant.openings ?? []) as Array<{ text: string; label: string }>;
  let openingText: string;

  if (openings.length === 0) {
    // Sem aberturas cadastradas — pede para IA improvisar baseada no contexto
    openingText = await generateOpening(job, lead.contact.name);
  } else {
    // Escolhe aleatória e substitui variáveis do contato + consultor
    const chosen = openings[Math.floor(Math.random() * openings.length)]!;
    openingText = await personalizeOpening(job, chosen.text, lead.contact);
  }

  // Cria conversation
  const conversation = await prisma.conversation.create({
    data: {
      leadId: lead.id,
      channel: job.channel as Channel,
    },
  });

  // Dispara conforme canal
  if (job.channel === Channel.WHATSAPP) {
    await scheduleWhatsAppSend({
      userId: job.userId,
      conversationId: conversation.id,
      to: lead.contact.phone!,
      text: openingText,
      senderType: MessageSender.AI,
    });
  } else if (job.channel === Channel.EMAIL) {
    const account = await prisma.emailAccount.findFirst({
      where: {
        userId: job.userId,
        isActive: true,
        OR: [{ consultantId: job.consultant.id }, { consultantId: null }],
      },
      orderBy: { consultantId: { sort: "desc", nulls: "last" } },
    });
    if (!account) return;
    await scheduleEmailSend({
      accountId: account.id,
      conversationId: conversation.id,
      to: lead.contact.email!,
      subject: inferOpeningSubject(job),
      body: openingText,
      senderType: MessageSender.AI,
    });
  }

  logger.info({ leadId: lead.id, channel: job.channel }, "🎯 Abertura disparada");
}

/**
 * Variáveis suportadas em textos de abertura (e em outros lugares no futuro):
 *   {nome}            → primeiro nome do contato
 *   {nome_completo}   → nome completo do contato
 *   {empresa}         → empresa do contato (Contact.company)
 *   {consultor}       → nome do consultor (AI persona)
 *   {minha_empresa}   → empresa do consultor (Consultant.company)
 *   {produto}         → produto/serviço configurado no consultor
 *   {cidade}          → cidade extraída do endereço do contato
 *   {segmento}        → público-alvo configurado no consultor
 *
 * Tokens não preenchidos somem (string vazia) em vez de ficar literalmente "{x}".
 */
function buildTemplateVars(
  job: { consultant: { name?: string; company?: string; product?: string; audience?: string } },
  contact: { name: string | null; company?: string | null; metadata?: unknown }
): Record<string, string> {
  const firstName = contact.name?.split(" ")[0] ?? "";
  const meta = (contact.metadata ?? {}) as Record<string, unknown>;
  const city =
    typeof meta.city === "string"
      ? meta.city
      : typeof meta.address === "string"
        ? extractCity(meta.address)
        : "";
  return {
    nome: firstName,
    nome_completo: contact.name ?? "",
    empresa: contact.company ?? "",
    consultor: job.consultant.name ?? "",
    minha_empresa: job.consultant.company ?? "",
    produto: job.consultant.product ?? "",
    segmento: job.consultant.audience ?? "",
    cidade: city,
  };
}

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key.toLowerCase()] ?? "");
}

/**
 * Tenta extrair a cidade de um endereço como "R. das Flores, 123 - Pinheiros, São Paulo - SP".
 * Pega o penúltimo segmento separado por vírgula como aproximação.
 */
function extractCity(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  // Penúltimo costuma ser bairro ou cidade
  const candidate = parts[parts.length - 2];
  if (!candidate) return "";
  // Remove sufixos "- SP" / "- RJ" etc
  return candidate.replace(/\s*-\s*[A-Z]{2}$/, "").trim();
}

async function personalizeOpening(
  job: any,
  baseText: string,
  contact: { name: string | null; company?: string | null; metadata?: unknown }
): Promise<string> {
  const vars = buildTemplateVars(job, contact);
  return renderTemplate(baseText, vars);
}

async function generateOpening(job: any, contactName: string | null): Promise<string> {
  const provider = getAIProvider();
  const systemPrompt = buildSystemPrompt({
    consultant: job.consultant,
    context: job.consultant.context,
    permissions: job.consultant.permissions,
    materials: job.consultant.materials,
    job,
    contactName,
  });

  return provider.chat({
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          "Escreva a primeira mensagem da abordagem (curta, natural, humanizada, máximo 2 frases). Não use saudação corporativa. Comece direto com algo que desperte curiosidade ou faça uma pergunta. Não mencione o nome do produto na primeira mensagem.",
      },
    ],
    maxTokens: 200,
  });
}

function inferOpeningSubject(job: any): string {
  // Subject curto baseado no objetivo
  switch (job.goal) {
    case "SCHEDULE_MEETING":
      return "Uma conversa rápida?";
    case "SEND_PROPOSAL":
      return "Algo que pode fazer sentido pra vocês";
    case "QUALIFY":
      return "Uma pergunta rápida";
    default:
      return "Acho que isso pode interessar";
  }
}
