/**
 * Smoke test da chave OpenAI.
 * Faz 1 chamada barata e mostra a resposta.
 */
import "dotenv/config";
import OpenAI from "openai";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("✗ OPENAI_API_KEY não encontrada");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: key });

async function main() {
  console.log("🔎 Testando chave OpenAI...");
  console.log(`Model: ${process.env.AI_MODEL_CONVERSATION ?? "gpt-4o-mini"}`);

  const t0 = Date.now();
  const res = await openai.chat.completions.create({
    model: process.env.AI_MODEL_CONVERSATION ?? "gpt-4o-mini",
    max_tokens: 50,
    messages: [
      { role: "system", content: "Responda apenas com a frase exata: 'OpenAI conectado ✓'" },
      { role: "user", content: "ping" },
    ],
  });
  const elapsed = Date.now() - t0;
  const text = res.choices[0]?.message?.content ?? "(vazio)";

  console.log(`\n✓ Resposta em ${elapsed}ms: ${text}`);
  console.log(`Tokens: in=${res.usage?.prompt_tokens} out=${res.usage?.completion_tokens}`);
  console.log(`Custo aprox: $${((res.usage?.total_tokens ?? 0) * 0.00015 / 1000).toFixed(6)}`);
}

main().catch((err) => {
  console.error("✗ Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
