// Palavras de opt-out (conforme spec do cliente)
export const OPT_OUT_KEYWORDS = [
  "sair",
  "parar",
  "cancelar",
  "não quero",
  "nao quero",
  "remover",
  "stop",
  "pare",
  "não tenho interesse",
  "nao tenho interesse",
];

// Janela permitida de envio (conforme cliente: 7h-22h)
export const SEND_WINDOW = {
  startHour: 7,
  endHour: 22,
};

// Delay humano entre mensagens (5s-20s — UX rápido pro cliente sentir o sistema vivo).
// ATENÇÃO: valores baixos AUMENTAM risco de ban do WhatsApp em chips não-aquecidos.
// Se aparecer banimento frequente, suba pra 20-60s.
export const SEND_DELAY_MS = {
  min: 5_000,
  max: 20_000,
};

// Texto padrão de opt-out a anexar nas conversas
export const OPT_OUT_NOTICE =
  "Se não quiser mais receber mensagens, responda com SAIR a qualquer momento.";
