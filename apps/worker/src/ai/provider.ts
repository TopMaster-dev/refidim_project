import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logger } from "../logger.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  /** Resposta conversacional curta em texto */
  chat(args: {
    system: string;
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<string>;

  /** Saída estruturada (JSON) para classificação/decisões */
  structured<T>(args: {
    system: string;
    messages: ChatMessage[];
    schemaName: string;
    schemaDescription: string;
    jsonSchema: object;
  }): Promise<T>;
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(args: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: args.maxTokens ?? 400,
      system: args.system,
      messages: args.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    const block = res.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : "";
  }

  async structured<T>(args: {
    system: string;
    messages: ChatMessage[];
    schemaName: string;
    schemaDescription: string;
    jsonSchema: object;
  }): Promise<T> {
    // Usa tool use para forçar saída estruturada
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: args.system,
      tools: [
        {
          name: args.schemaName,
          description: args.schemaDescription,
          input_schema: args.jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: args.schemaName },
      messages: args.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || !("input" in toolUse)) {
      throw new Error("Claude não retornou tool_use");
    }
    return toolUse.input as T;
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(args: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: args.maxTokens ?? 400,
      messages: [
        { role: "system", content: args.system },
        ...args.messages.filter((m) => m.role !== "system"),
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  }

  async structured<T>(args: {
    system: string;
    messages: ChatMessage[];
    schemaName: string;
    schemaDescription: string;
    jsonSchema: object;
  }): Promise<T> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: args.system },
        ...args.messages.filter((m) => m.role !== "system"),
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: args.schemaName,
          description: args.schemaDescription,
          schema: args.jsonSchema as Record<string, unknown>,
          strict: true,
        },
      },
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI não retornou conteúdo");
    return JSON.parse(content) as T;
  }
}

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (provider) return provider;

  const which = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();

  if (which === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurado");
    const model = process.env.AI_MODEL_CONVERSATION ?? "claude-haiku-4-5-20251001";
    logger.info({ provider: "anthropic", model }, "🧠 IA configurada");
    provider = new AnthropicProvider(key, model);
  } else if (which === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY não configurado");
    const model = process.env.AI_MODEL_CONVERSATION ?? "gpt-4o-mini";
    logger.info({ provider: "openai", model }, "🧠 IA configurada");
    provider = new OpenAIProvider(key, model);
  } else {
    throw new Error(`AI_PROVIDER desconhecido: ${which}`);
  }

  return provider;
}

export function hasAIProvider(): boolean {
  const which = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (which === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (which === "openai") return !!process.env.OPENAI_API_KEY;
  return false;
}
