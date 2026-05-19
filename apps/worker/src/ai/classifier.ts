import { getAIProvider, type ChatMessage } from "./provider.js";

export interface LeadClassification {
  status: "COLD" | "WARM" | "HOT";
  reason: string;
  triggerHumanAlert: boolean;
  alertReason: string | null;
}

// OpenAI strict mode exige TODOS os campos em `required` e campos nullable
// devem usar type: ["string", "null"] (não optional).
const CLASSIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["COLD", "WARM", "HOT"],
      description:
        "Classificação do lead após esta troca de mensagens. COLD = sem interesse claro/respostas vagas. WARM = perguntou, demonstrou curiosidade. HOT = pediu reunião/proposta/demonstração ou interesse claro de avançar.",
    },
    reason: {
      type: "string",
      description: "Razão objetiva e curta (1 frase) para a classificação.",
    },
    triggerHumanAlert: {
      type: "boolean",
      description:
        "Verdadeiro se um humano deve ser alertado AGORA (lead pediu reunião/proposta/demonstração, demonstrou urgência, ou aceitou próximo passo). Perguntar preço sozinho NÃO basta.",
    },
    alertReason: {
      type: ["string", "null"],
      description: "Se triggerHumanAlert=true, motivo curto do alerta. Use null caso contrário.",
    },
  },
  required: ["status", "reason", "triggerHumanAlert", "alertReason"],
};

const CLASSIFIER_SYSTEM = `Você é um classificador de leads B2B. Sua função é analisar a conversa entre um vendedor e um possível cliente e classificar o lead em COLD/WARM/HOT.

Definições objetivas:
- COLD (frio): não respondeu, ou respostas vagas como "ok", "vou ver depois", visualizou e ignorou
- WARM (morno): fez perguntas concretas ("como funciona?", "isso serve pra empresa pequena?"), demonstrou curiosidade ou continuou a conversa
- HOT (quente): pediu reunião, demonstração, proposta, perguntou "como começamos?", demonstrou urgência, ou aceitou claramente um próximo passo

Disparar alerta humano (triggerHumanAlert=true) quando:
- Pediu reunião, demonstração, proposta
- Perguntou "como começar/contratar"
- Aceitou aceitou explicitamente próximo passo
- Demonstrou urgência clara
- Ou a IA não consegue mais avançar (técnico/jurídico/financeiro detalhado)

NÃO disparar alerta só por:
- Perguntar preço (a IA pode redirecionar)
- Estar fazendo perguntas exploratórias

Responda APENAS via tool/JSON.`;

/**
 * Classifica o lead com base no histórico da conversa.
 */
export async function classifyLead(history: ChatMessage[]): Promise<LeadClassification> {
  const provider = getAIProvider();
  return provider.structured<LeadClassification>({
    system: CLASSIFIER_SYSTEM,
    messages: history,
    schemaName: "classify_lead",
    schemaDescription: "Classifica o lead como COLD/WARM/HOT e decide sobre alerta humano",
    jsonSchema: CLASSIFIER_SCHEMA,
  });
}
