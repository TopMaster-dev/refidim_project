/**
 * Detecta se uma mensagem recebida parece ser de um sistema automatizado
 * (autoresponder, URA, chatbot, atendimento por menu).
 *
 * O cliente reportou que a IA estava entrando em loop conversando com outras
 * automações — número da empresa-alvo tem auto-reply, nossa IA respondia,
 * autoresponder respondia de novo, etc.
 *
 * Detecção é heurística mas conservadora. Falso positivo significa a gente
 * pausa uma conversa válida (recuperável — humano reativa). Falso negativo
 * significa loop com bot (pior — gasta token, parece amador, eventualmente
 * o WhatsApp ban).
 */

interface BotDetectionResult {
  isLikelyBot: boolean;
  confidence: "low" | "medium" | "high";
  reasons: string[];
}

const BOT_KEYWORDS = [
  // Menus / opções
  "atendimento automático",
  "atendimento automatico",
  "menu principal",
  "menu de atendimento",
  "selecione uma opção",
  "selecione uma opcao",
  "digite o número",
  "digite o numero",
  "responda com o número",
  "para falar com",
  "horário de atendimento",
  "horario de atendimento",
  // Protocolo / dados estruturados
  "protocolo de atendimento",
  "número de protocolo",
  "informe seu cpf",
  "digite seu cpf",
  "para sua segurança, informe",
  "para sua seguranca, informe",
  // Mensagens automáticas comuns
  "mensagem automática",
  "mensagem automatica",
  "esta é uma resposta automática",
  "esta e uma resposta automatica",
  "obrigado por entrar em contato",
  "responderemos em breve",
  "responderemos assim que possível",
  "ausente no momento",
  "fora do horário",
  "fora do horario",
  // Padrões de loja/SAC
  "sou a assistente virtual",
  "sou o assistente virtual",
  "assistente automatizado",
];

// Menus numerados: linha começa com "1)", "1 -", "1.", etc, e aparece pelo menos 2x
const NUMBERED_MENU_REGEX = /^\s*[1-9][\.\)\-—]\s+\S/gm;

export function detectAutoReply(text: string): BotDetectionResult {
  const reasons: string[] = [];
  if (!text) return { isLikelyBot: false, confidence: "low", reasons: [] };

  const normalized = text.toLowerCase();
  const len = text.length;

  // Sinal 1: keywords inequívocos de automação
  const keywordHit = BOT_KEYWORDS.find((kw) => normalized.includes(kw));
  if (keywordHit) reasons.push(`keyword: "${keywordHit}"`);

  // Sinal 2: menu numerado (3+ itens "1) ... 2) ... 3) ...")
  const menuMatches = text.match(NUMBERED_MENU_REGEX);
  if (menuMatches && menuMatches.length >= 3) {
    reasons.push(`menu numerado (${menuMatches.length} opções)`);
  }

  // Sinal 3: mensagem MUITO longa (>700 chars) — humanos no WhatsApp raramente
  // mandam parede de texto na primeira resposta
  if (len > 700) reasons.push(`muito longa (${len} chars)`);

  // Sinal 4: contém múltiplos emojis decorativos típicos de menu (📞 ✉️ 🕐 etc)
  const decorativeEmojiCount = (
    text.match(/[\u{1F4DE}\u{2709}\u{1F551}\u{1F4CD}\u{1F4F1}\u{1F4E7}]/gu) ?? []
  ).length;
  if (decorativeEmojiCount >= 3) reasons.push(`emojis de menu (${decorativeEmojiCount})`);

  // Confidence:
  //   - keyword OU (menu numerado) = high
  //   - tamanho grande OU emojis = medium
  //   - combinação fraca = low
  let confidence: BotDetectionResult["confidence"] = "low";
  if (keywordHit || (menuMatches && menuMatches.length >= 3)) confidence = "high";
  else if (len > 700 && decorativeEmojiCount >= 3) confidence = "medium";
  else if (reasons.length >= 2) confidence = "medium";

  const isLikelyBot = confidence === "high" || confidence === "medium";

  return { isLikelyBot, confidence, reasons };
}
