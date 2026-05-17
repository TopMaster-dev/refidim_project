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

// Delay humano entre mensagens (conforme cliente: 25s-90s)
export const SEND_DELAY_MS = {
  min: 25_000,
  max: 90_000,
};

// Texto padrão de opt-out a anexar nas conversas
export const OPT_OUT_NOTICE =
  "Se não quiser mais receber mensagens, responda com SAIR a qualquer momento.";
