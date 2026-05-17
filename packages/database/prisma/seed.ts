import { PrismaClient, PlanTier, SubscriptionStatus, ConsultantGoal, ConversationTone } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// Hash simples só para seed. Auth real usa bcrypt.
function devHash(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

async function main() {
  console.log("🌱 Seeding Refidim development data...");

  const user = await prisma.user.upsert({
    where: { email: "admin@refidim.com.br" },
    update: {},
    create: {
      email: "admin@refidim.com.br",
      name: "Admin Refidim",
      passwordHash: devHash("refidim123"),
      phone: "+5511999999999",
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: PlanTier.SCALE,
      status: SubscriptionStatus.ACTIVE,
      leadLimit: 20000,
      consultantLimit: 999,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Consultor de exemplo — conforme respostas do cliente
  const consultant = await prisma.consultant.upsert({
    where: { id: "seed-consultant-refidim" },
    update: {},
    create: {
      id: "seed-consultant-refidim",
      userId: user.id,
      name: "Refidim Comercial",
      company: "Refidim",
      product:
        "Sistema que trabalha contatos automaticamente, conversa de forma natural e entrega oportunidades prontas para o humano assumir.",
      audience:
        "Pequenas e médias empresas que vendem pelo WhatsApp e perdem oportunidades por falta de tempo ou organização.",
      tone: ConversationTone.CONSULTIVE,
      goal: ConsultantGoal.SCHEDULE_MEETING,
    },
  });

  await prisma.businessContext.upsert({
    where: { consultantId: consultant.id },
    update: {},
    create: {
      consultantId: consultant.id,
      whatYouSell:
        "Plataforma de prospecção via WhatsApp e e-mail com IA que conversa de forma humana e identifica leads quentes.",
      whoYouSellTo:
        "PMEs que vendem pelo WhatsApp e perdem leads por falta de tempo ou organização.",
      mainBenefit:
        "Parar de perder lead quente e focar apenas em quem realmente demonstrou interesse.",
      differentials:
        "Conversa humanizada; não parece chatbot; classifica leads automaticamente; funciona com listas próprias, Google e tráfego pago; direciona o humano no momento certo.",
      commonObjections: [
        { objection: "Agora não tenho interesse.", idealAnswer: "Tranquilo. Hoje vocês já usam alguma estratégia para trabalhar os contatos que chegam pelo WhatsApp?" },
        { objection: "Manda mais informações.", idealAnswer: "Claro. Só pra eu te mandar algo mais alinhado: hoje o maior desafio aí é atendimento ou conversão?" },
        { objection: "Quanto custa?", idealAnswer: "Te passo sim. Só pra eu te explicar certinho: isso seria para uso interno da empresa ou para equipe comercial?" },
        { objection: "Não tenho tempo agora.", idealAnswer: "Sem problema. Qual horário costuma ser mais tranquilo pra você normalmente?" },
        { objection: "Já usamos algo parecido.", idealAnswer: "Entendi. E hoje o que sente que ainda poderia melhorar nessa parte?" },
        { objection: "Como conseguiu meu contato?", idealAnswer: "Encontrei através de contatos públicos da sua empresa. Vi que vocês atendem pelo WhatsApp e achei que poderia fazer sentido te mostrar." },
        { objection: "Isso funciona mesmo?", idealAnswer: "O objetivo é justamente evitar que contatos interessados esfriem por falta de resposta ou acompanhamento." },
        { objection: "Preciso pensar.", idealAnswer: "Claro. O que mais te deixou em dúvida até agora?" },
      ],
      conversationGoal: "Identificar interesse real e conduzir o lead até aceitar uma demonstração ou reunião.",
      glossaryAllowed: [
        "atendimento", "oportunidades", "contatos", "comercial", "interesse",
        "acompanhamento", "organização", "conversas", "equipe", "clientes",
        "WhatsApp", "demonstração", "implantação", "resultado", "captação",
      ],
      glossaryBlocked: [
        "robô", "bot", "automação em massa", "disparador",
        "inteligência artificial", "funil automatizado", "scraping",
        "extração agressiva", "lead ilimitado", "venda garantida",
        "spam", "hack", "black", "mensagem automática",
      ],
      forbiddenActions: [
        "Inventar informações",
        "Inventar preços ou descontos",
        "Garantir vendas ou resultados",
        "Fingir ser humano real se perguntarem diretamente",
        "Insistir excessivamente após negativa",
        "Enviar mensagens agressivas ou invasivas",
        "Fazer promessas financeiras",
        "Falar mal de concorrentes",
        "Solicitar dados sensíveis",
        "Sair do contexto configurado pelo usuário",
        "Continuar conversa técnica/jurídica sem chamar humano",
        "Enviar links suspeitos ou não configurados",
        "Dizer que ganha clientes automaticamente",
        "Usar linguagem de spam ou pressão exagerada",
      ],
    },
  });

  await prisma.consultantPermission.upsert({
    where: { consultantId: consultant.id },
    update: {},
    create: {
      consultantId: consultant.id,
      canMentionPrice: false,
      canSendLink: true,
      canSendPresentation: true,
      canSuggestMeeting: true,
      canAnswerQuestions: true,
      callHumanIfOutOfScope: true,
    },
  });

  // Modelos de abertura (variações)
  const openings = [
    { label: "leve", text: "Oi! Tudo bem? Posso te fazer uma pergunta rápida sobre como vocês acompanham os contatos que chegam pelo WhatsApp?" },
    { label: "consultiva", text: "Olá! Vi que vocês atendem bastante pelo WhatsApp. Hoje conseguem responder todos os contatos no mesmo dia ou alguns acabam esfriando?" },
    { label: "direta", text: "Oi! Trabalho com automação de prospecção. Em 30s consigo te mostrar como evitar perder lead quente — faz sentido?" },
    { label: "curiosidade", text: "Oi! Uma curiosidade: dos contatos que chegam pra vocês pelo WhatsApp, mais ou menos quantos viram cliente?" },
    { label: "comercial", text: "Olá! Sou da Refidim. Ajudamos empresas a não perder mais oportunidade no WhatsApp. Vale uma conversa rápida pra te mostrar?" },
  ];

  for (const opening of openings) {
    await prisma.openingTemplate.upsert({
      where: { id: `seed-opening-${opening.label}` },
      update: {},
      create: {
        id: `seed-opening-${opening.label}`,
        consultantId: consultant.id,
        label: opening.label,
        text: opening.text,
      },
    });
  }

  console.log("✅ Seed concluído");
  console.log(`   Usuário: ${user.email} (senha dev: refidim123)`);
  console.log(`   Consultor: ${consultant.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
