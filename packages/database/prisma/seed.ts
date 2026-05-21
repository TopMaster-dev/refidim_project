import "dotenv/config";
import { PrismaClient, PlanTier, SubscriptionStatus, ConsultantGoal, ConversationTone } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Refidim development data...");

  const passwordHash = await bcrypt.hash("refidim123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@refidim.com.br" },
    update: { passwordHash },
    create: {
      email: "admin@refidim.com.br",
      name: "Admin Refidim",
      passwordHash,
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
  const consultantData = {
    userId: user.id,
    name: "Refidim Comercial",
    company: "Refidim",
    product:
      "REFIDIM é uma plataforma inteligente de prospecção e conversão automatizada que encontra empresas, inicia conversas de forma natural, qualifica oportunidades automaticamente e entrega leads quentes prontos para fechamento pelo time comercial.",
    audience:
      "Pequenas e médias empresas que precisam gerar oportunidades comerciais de forma previsível, sem depender de prospecção manual, equipe sobrecarregada ou tráfego pago.",
    tone: ConversationTone.CONSULTIVE,
    goal: ConsultantGoal.SCHEDULE_MEETING,
  };
  const consultant = await prisma.consultant.upsert({
    where: { id: "seed-consultant-refidim" },
    update: consultantData,
    create: { id: "seed-consultant-refidim", ...consultantData },
  });

  const businessContextData = {
      consultantId: consultant.id,
      whatYouSell:
        "REFIDIM é uma plataforma inteligente de prospecção e conversão automatizada que encontra empresas, inicia conversas de forma natural, qualifica oportunidades automaticamente e entrega leads quentes prontos para fechamento pelo time comercial.",
      whoYouSellTo:
        "Pequenas e médias empresas que precisam gerar oportunidades comerciais de forma previsível, sem depender de prospecção manual, equipe sobrecarregada ou tráfego pago.",
      mainBenefit:
        "O REFIDIM elimina a etapa mais lenta, cara e desgastante do processo comercial: encontra, inicia conversa, qualifica o lead e aciona o time comercial em oportunidades reais de fechamento — tudo no automático.",
      differentials:
        "Conversa humanizada; não parece chatbot; classifica leads automaticamente; funciona com listas próprias, Google e tráfego pago; direciona o humano no momento certo.",
      commonObjections: [
        { objection: "Agora não tenho interesse.", idealAnswer: "Tranquilo! Vocês já possuem algum sistema para fazer a captação, abordagem inicial e qualificação de contatos? Nosso sistema faz tudo isso, sem custo de captação, e entrega apenas oportunidades com potencial real para o comercial fazer o fechamento." },
        { objection: "Manda mais informações.", idealAnswer: "Claro. Só pra eu te mandar algo mais personalizado ao seu negócio: hoje o maior desafio aí é manter ou atrair novos clientes?" },
        { objection: "O responsável não se encontra no momento.", idealAnswer: "Sem problema! Qual o melhor horário para falar com ele(a)? É algo rápido e acredito que possa ser relevante para reduzir custo e aumentar o faturamento da empresa, foi um amigo em comum que fez a indicação." },
        { objection: "Não tenho tempo agora.", idealAnswer: "Sem problema. Qual horário costuma ser mais tranquilo pra você normalmente?" },
        { objection: "Já usamos algo parecido.", idealAnswer: "Excelente, isso mostra que vocês já enxergam valor nesse tipo de processo. Me conta uma coisa: o que sentiram que funcionou bem e o que deixou a desejar?" },
        { objection: "Como conseguiu meu contato?", idealAnswer: "Nosso sistema faz análise na internet, em tempo real, de empresas com potencial de crescimento como a sua e faz a captação." },
        { objection: "Isso funciona mesmo?", idealAnswer: "Sim. O conceito é simples: enquanto muitas empresas ainda dependem de prospecção manual, nossa tecnologia automatiza captação, abordagem inicial e qualificação — entregando apenas oportunidades com potencial real de fechamento para o comercial, sem nenhum custo de tráfego pago." },
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
      // Few-shot examples derivados dos prints reais do cliente — ensinam TOM.
      referenceMessages: [
        {
          scenario: "Abertura ultra-curta confirmando contato",
          message: "Boa tarde! É da [empresa do contato]?",
          lesson:
            "Aberturas podem ser uma única pergunta curta para confirmar que está falando com a empresa certa. Sem apresentação, sem pitch.",
        },
        {
          scenario: "Abertura pedindo direcionamento (em vez de empurrar)",
          message:
            "Boa tarde! Poderia me direcionar para o responsável da [empresa]? Agradeço desde já!",
          lesson:
            "Quando não sabemos quem é o decisor, abordamos pedindo ajuda em vez de empurrar oferta. Tom humilde.",
        },
        {
          scenario: "Follow-up gentil após silêncio",
          message:
            "Bom dia [nome], mandando novamente para caso não tenha visto a última mensagem. Estou falando com a pessoa certa?",
          lesson:
            "Follow-up sem pressão: assume boa fé ('caso não tenha visto') e repete o ponto principal em 1 linha. Nunca cobra.",
        },
        {
          scenario: "Apresentação curta após primeiro engajamento",
          message:
            "[Nome], obrigado pelo retorno e peço desculpas se gerou confusão. Sou o [seu nome] da [empresa]. Nossa plataforma ajuda [o que faz em 1 frase]. Vocês ou os clientes de vocês têm o problema X? A gente costuma ajudar [exemplos de quem atende] e, se fizer sentido pra vocês, posso enviar uma apresentação para avaliarem sem compromisso.",
          lesson:
            "Apresentação ideal: agradece + se identifica + 1 frase do produto + pergunta qualificadora + dá exemplo de quem atende + oferece material 'sem compromisso'. NUNCA promete resultado.",
        },
        {
          scenario: "Reação respeitosa a um 'não'",
          message:
            "[Nome], obrigado por responder. Respeito totalmente o seu 'não'. Se puder, gostaria de entender: o que fez não fazer sentido para vocês? Abraço.",
          lesson:
            "Quando o lead recusa, NUNCA insistir. Agradece + respeita explicitamente + pede feedback aberto + encerra com 'abraço'. Pode virar morno em outro momento.",
        },
      ],
  };

  await prisma.businessContext.upsert({
    where: { consultantId: consultant.id },
    update: businessContextData,
    create: businessContextData,
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
