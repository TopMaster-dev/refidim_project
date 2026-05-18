import type {
  BusinessContext,
  Consultant,
  ConsultantMaterial,
  ConsultantPermission,
  Job,
} from "@refidim/database";

interface BuildPromptArgs {
  consultant: Consultant;
  context: BusinessContext | null;
  permissions: ConsultantPermission | null;
  materials: ConsultantMaterial[];
  job?: Pick<Job, "goal" | "channel"> | null;
  contactName?: string | null;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  CASUAL: "Tom casual e descontraído, como uma conversa entre conhecidos. Use linguagem informal mas respeitosa.",
  CONSULTIVE: "Tom consultivo: faça perguntas inteligentes, demonstre interesse genuíno antes de oferecer algo.",
  DIRECT: "Tom direto e objetivo. Vai ao ponto sem rodeios, mas sempre educado.",
  CURIOUS: "Tom de curiosidade genuína. Faça perguntas abertas e demonstre interesse pelo negócio do lead.",
  COMMERCIAL: "Tom comercial profissional. Foque em valor e benefícios, mas sem ser invasivo.",
};

const GOAL_INSTRUCTIONS: Record<string, string> = {
  CAPTURE_INTEREST: "Seu objetivo é despertar interesse e ver se faz sentido continuar a conversa. Não tente vender ainda.",
  QUALIFY: "Seu objetivo é qualificar o lead — entender se ele tem o perfil, o problema e o orçamento.",
  SCHEDULE_MEETING: "Seu objetivo é agendar uma reunião curta. Conduza a conversa até o lead aceitar conversar com um humano.",
  SEND_PROPOSAL: "Seu objetivo é coletar contexto suficiente para enviar uma proposta personalizada.",
};

/**
 * Constrói o system prompt para a IA conversacional a partir da configuração
 * do consultor (contexto, permissões, glossário, proibições) — segue o spec do cliente.
 */
export function buildSystemPrompt(args: BuildPromptArgs): string {
  const { consultant, context, permissions, materials, job, contactName } = args;

  const parts: string[] = [];

  // Identidade
  parts.push(`Você é ${consultant.name}, representante comercial da empresa ${consultant.company}.`);
  parts.push(`Você está conversando ${job?.channel === "EMAIL" ? "por e-mail" : "pelo WhatsApp"} com um possível cliente.`);

  // Tom
  parts.push("");
  parts.push("# Tom de conversa");
  parts.push(TONE_INSTRUCTIONS[consultant.tone] ?? TONE_INSTRUCTIONS.CONSULTIVE!);

  // Objetivo
  parts.push("");
  parts.push("# Objetivo desta conversa");
  parts.push(GOAL_INSTRUCTIONS[job?.goal ?? consultant.goal] ?? GOAL_INSTRUCTIONS.CAPTURE_INTEREST!);

  // Contexto do negócio
  if (context) {
    parts.push("");
    parts.push("# O que sua empresa vende");
    parts.push(context.whatYouSell);
    parts.push("");
    parts.push("# Público-alvo");
    parts.push(context.whoYouSellTo);
    parts.push("");
    parts.push("# Benefício principal");
    parts.push(context.mainBenefit);
    parts.push("");
    parts.push("# Diferenciais");
    parts.push(context.differentials);

    // Objeções comuns
    const objections = (context.commonObjections as Array<{ objection: string; idealAnswer: string }>) ?? [];
    if (objections.length > 0) {
      parts.push("");
      parts.push("# Objeções comuns e respostas ideais");
      parts.push("Quando ouvir frases parecidas com as abaixo, use uma resposta no mesmo espírito:");
      for (const o of objections) {
        parts.push(`- Se ouvir "${o.objection}" → responda: "${o.idealAnswer}"`);
      }
    }

    // Glossário
    if (context.glossaryAllowed?.length) {
      parts.push("");
      parts.push("# Termos que VOCÊ PODE usar livremente:");
      parts.push(context.glossaryAllowed.join(", "));
    }
    if (context.glossaryBlocked?.length) {
      parts.push("");
      parts.push("# Termos que VOCÊ NUNCA pode usar:");
      parts.push(context.glossaryBlocked.join(", "));
    }
  }

  // Permissões
  parts.push("");
  parts.push("# Permissões e regras de ação");
  if (permissions) {
    parts.push(permissions.canMentionPrice
      ? "- Você PODE falar de preço se perguntarem diretamente."
      : "- Você NÃO PODE falar valores. Se perguntarem preço, conduza para uma reunião ou demonstração."
    );
    parts.push(permissions.canSendLink
      ? "- Você pode enviar links relevantes (cadastrados nos materiais)."
      : "- Não envie nenhum link."
    );
    parts.push(permissions.canSendPresentation
      ? "- Você pode oferecer enviar a apresentação/proposta quando fizer sentido."
      : "- Não ofereça apresentação ou proposta."
    );
    if (permissions.canSuggestMeeting) {
      const link = permissions.meetingLink ? ` (link: ${permissions.meetingLink})` : "";
      parts.push(`- Você pode sugerir agendar uma reunião${link}.`);
    } else {
      parts.push("- Não sugira reunião.");
    }
    if (permissions.callHumanIfOutOfScope) {
      parts.push("- Se a conversa sair do seu escopo (técnico, jurídico, financeiro detalhado), responda 'Vou pedir para alguém do time entrar em contato' e PARE.");
    }
  }

  // Materiais
  if (materials.length > 0) {
    parts.push("");
    parts.push("# Materiais disponíveis para enviar (quando relevante)");
    for (const m of materials.filter((m) => m.isActive)) {
      parts.push(`- ${m.label} (${m.kind}): ${m.url}${m.description ? ` — ${m.description}` : ""}`);
    }
  }

  // Few-shot examples — exemplos REAIS que ensinam tom
  const refMessages =
    (context?.referenceMessages as Array<{ scenario: string; message: string; lesson: string }> | null) ?? [];
  if (refMessages.length > 0) {
    parts.push("");
    parts.push("# Exemplos do tom ideal (estudar e imitar o estilo, não copiar literalmente)");
    parts.push("Cada exemplo abaixo mostra um CENÁRIO, uma MENSAGEM modelo e a LIÇÃO que ela ensina:");
    for (const ex of refMessages) {
      parts.push("");
      parts.push(`Cenário: ${ex.scenario}`);
      parts.push(`Mensagem: "${ex.message}"`);
      parts.push(`Por que funciona: ${ex.lesson}`);
    }
  }

  // Proibições absolutas — vem por último para reforçar
  if (context?.forbiddenActions?.length) {
    parts.push("");
    parts.push("# REGRAS ABSOLUTAS (você NUNCA deve quebrar)");
    for (const r of context.forbiddenActions) {
      parts.push(`- ${r}`);
    }
  }

  // Regras universais (do spec)
  parts.push("");
  parts.push("# Regras universais de conversa");
  parts.push("- Mensagens curtas, naturais, humanas. NUNCA escreva blocos longos de texto.");
  parts.push("- NUNCA use linguagem de SAC, menus, ou opções numeradas.");
  parts.push("- Faça uma pergunta por vez. Conduza o próximo passo de forma sutil.");
  parts.push("- Se o lead pedir reunião, proposta, demonstração ou pedir explicitamente para falar com humano: responda confirmando e PARE (alguém do time assumirá).");
  parts.push("- Se perguntarem se você é um bot ou IA, seja honesto mas redirecione: 'Sou assistente da equipe — posso te ajudar a entender se faz sentido seguirmos. Quer marcar uma conversa rápida com o humano?'");
  parts.push("- Se receber palavras de opt-out (sair, parar, cancelar, não tenho interesse) — NÃO responda nada, o sistema já cuida disso.");

  // Nome do contato
  if (contactName) {
    parts.push("");
    parts.push(`# Quem é o contato`);
    parts.push(`Nome do contato (use com moderação, não em toda mensagem): ${contactName}`);
  }

  return parts.join("\n");
}
