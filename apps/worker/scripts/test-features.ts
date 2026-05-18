/**
 * Suite de testes automatizados — Refidim
 *
 * Verifica:
 * - Conexão e integridade do banco
 * - Tabelas e seed
 * - Lógica de cripto, opt-out, janela de envio
 * - System prompt builder (estrutura)
 * - Subscription gate
 * - Webhook handler (via HTTP)
 *
 * Rode com:
 *   pnpm --filter @refidim/worker exec tsx scripts/test-features.ts
 */

import "dotenv/config";
import {
  prisma,
  PlanTier,
  SubscriptionStatus,
  LeadStatus,
  type Subscription,
} from "@refidim/database";
import {
  encryptSecret,
  decryptSecret,
  OPT_OUT_KEYWORDS,
  OPT_OUT_NOTICE,
  SEND_WINDOW,
  SEND_DELAY_MS,
  PLAN_CONFIGS,
  ALL_PLANS,
  leadClassificationSchema,
  signUpSchema,
  consultantSchema,
  businessContextSchema,
} from "@refidim/shared";
import bcrypt from "bcryptjs";
import { buildSystemPrompt } from "../src/ai/prompt.js";
import { isWithinSendWindow, msUntilNextWindow } from "../src/whatsapp/sender.js";

interface TestResult {
  group: string;
  name: string;
  pass: boolean;
  detail?: string;
}

const results: TestResult[] = [];
let currentGroup = "";

function group(name: string) {
  currentGroup = name;
  console.log(`\n\x1b[36m■ ${name}\x1b[0m`);
}

async function test(name: string, fn: () => Promise<boolean | string> | boolean | string) {
  try {
    const r = await fn();
    const pass = r === true;
    const detail = typeof r === "string" ? r : undefined;
    results.push({ group: currentGroup, name, pass, detail });
    console.log(
      pass
        ? `  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`
        : `  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ group: currentGroup, name, pass: false, detail: msg });
    console.log(`  \x1b[31m✗\x1b[0m ${name} — ${msg}`);
  }
}

function eq<T>(a: T, b: T): boolean | string {
  if (a === b) return true;
  return `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`;
}

// ---------- Tests ----------

async function testCrypto() {
  group("Cripto (AES-256-GCM)");

  await test("encrypt + decrypt round-trip", () => {
    const plaintext = "minha-senha-secreta-123";
    const enc = encryptSecret(plaintext);
    const dec = decryptSecret(enc);
    return eq(dec, plaintext);
  });

  await test("ciphertext em formato 'iv:tag:ct'", () => {
    const enc = encryptSecret("test");
    return enc.split(":").length === 3 || "formato inválido";
  });

  await test("descriptografar com tag inválida falha", () => {
    const enc = encryptSecret("test");
    const [iv, , ct] = enc.split(":");
    try {
      decryptSecret(`${iv}:AAAAAAAAAAAAAAAAAAAAAA==:${ct}`);
      return "deveria ter lançado erro";
    } catch {
      return true;
    }
  });

  await test("textos diferentes geram ciphertexts diferentes", () => {
    const a = encryptSecret("texto");
    const b = encryptSecret("texto");
    return a !== b || "IV não está sendo randomizado";
  });
}

async function testConstants() {
  group("Constantes do spec do cliente");

  await test("janela de envio 7h-22h", () =>
    SEND_WINDOW.startHour === 7 && SEND_WINDOW.endHour === 22 ||
    `got ${JSON.stringify(SEND_WINDOW)}`);

  await test("delay 25-90s", () =>
    SEND_DELAY_MS.min === 25000 && SEND_DELAY_MS.max === 90000 ||
    `got ${JSON.stringify(SEND_DELAY_MS)}`);

  await test("opt-out tem palavras essenciais", () => {
    const required = ["sair", "parar", "cancelar", "stop"];
    const missing = required.filter((k) => !OPT_OUT_KEYWORDS.includes(k));
    return missing.length === 0 || `faltando: ${missing.join(", ")}`;
  });

  await test("opt-out notice em PT-BR", () =>
    OPT_OUT_NOTICE.includes("SAIR") || "não menciona SAIR");
}

async function testPlans() {
  group("Planos");

  await test("3 planos definidos (Start, Pro, Scale)", () =>
    ALL_PLANS.length === 3 || `got ${ALL_PLANS.length}`);

  await test("Start: 3000 leads / 1 consultor", () =>
    PLAN_CONFIGS.START.leadLimit === 3000 &&
    PLAN_CONFIGS.START.consultantLimit === 1 ||
    `got ${JSON.stringify(PLAN_CONFIGS.START)}`);

  await test("Pro: 8000 leads / 3 consultores", () =>
    PLAN_CONFIGS.PRO.leadLimit === 8000 &&
    PLAN_CONFIGS.PRO.consultantLimit === 3 ||
    `got ${JSON.stringify(PLAN_CONFIGS.PRO)}`);

  await test("Scale: 20000 leads / ilimitado", () =>
    PLAN_CONFIGS.SCALE.leadLimit === 20000 &&
    PLAN_CONFIGS.SCALE.consultantLimit === 999 ||
    `got ${JSON.stringify(PLAN_CONFIGS.SCALE)}`);
}

async function testSendWindow() {
  group("Janela de envio");

  await test("isWithinSendWindow às 14h (dentro)", () => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return isWithinSendWindow(d) === true || "deveria estar dentro";
  });

  await test("isWithinSendWindow às 5h (fora)", () => {
    const d = new Date();
    d.setHours(5, 0, 0, 0);
    return isWithinSendWindow(d) === false || "deveria estar fora";
  });

  await test("isWithinSendWindow às 23h (fora)", () => {
    const d = new Date();
    d.setHours(23, 0, 0, 0);
    return isWithinSendWindow(d) === false || "deveria estar fora";
  });

  await test("msUntilNextWindow=0 quando dentro", () => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return msUntilNextWindow(d) === 0 || `got ${msUntilNextWindow(d)}`;
  });

  await test("msUntilNextWindow > 0 quando fora", () => {
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    return msUntilNextWindow(d) > 0 || "deveria ser > 0";
  });
}

async function testSchemas() {
  group("Schemas Zod de entrada");

  await test("signUpSchema aceita dados válidos", () => {
    const r = signUpSchema.safeParse({
      name: "João Silva",
      email: "joao@teste.com",
      password: "senha1234",
    });
    return r.success || r.error.issues[0]?.message;
  });

  await test("signUpSchema rejeita e-mail inválido", () => {
    const r = signUpSchema.safeParse({
      name: "João",
      email: "não-é-email",
      password: "senha1234",
    });
    return !r.success || "deveria rejeitar";
  });

  await test("signUpSchema rejeita senha curta", () => {
    const r = signUpSchema.safeParse({
      name: "João",
      email: "j@t.com",
      password: "123",
    });
    return !r.success || "deveria rejeitar";
  });

  await test("consultantSchema aceita dados válidos", () => {
    const r = consultantSchema.safeParse({
      name: "Consultor",
      company: "Empresa",
      product: "Produto descritivo longo",
      audience: "Público-alvo descritivo",
      tone: "CONSULTIVE",
      goal: "SCHEDULE_MEETING",
    });
    return r.success || r.error.issues[0]?.message;
  });

  await test("businessContextSchema valida objeções", () => {
    const r = businessContextSchema.safeParse({
      whatYouSell: "Algo bem descritivo aqui",
      whoYouSellTo: "Público completo descrito",
      mainBenefit: "Benefício principal claro",
      differentials: "Diferenciais detalhados",
      conversationGoal: "Objetivo da conversa",
      commonObjections: [
        { objection: "Caro", idealAnswer: "Entendo, posso explicar valor" },
      ],
    });
    return r.success || r.error.issues[0]?.message;
  });

  await test("leadClassificationSchema valida saída IA", () => {
    const r = leadClassificationSchema.safeParse({
      status: "HOT",
      reason: "Pediu reunião",
      triggerHumanAlert: true,
      alertReason: "Lead quente",
    });
    return r.success || r.error.issues[0]?.message;
  });
}

async function testDatabase() {
  group("Banco de dados");

  await test("conexão Postgres", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  });

  await test("16 tabelas no schema", async () => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const count = Number(rows[0]?.count ?? 0);
    return count >= 16 || `encontrou ${count} (esperado ≥16)`;
  });

  await test("usuário seedado existe", async () => {
    const u = await prisma.user.findUnique({
      where: { email: "admin@refidim.com.br" },
    });
    return !!u || "seed não rodou";
  });

  await test("hash da senha do seed é bcrypt", async () => {
    const u = await prisma.user.findUnique({
      where: { email: "admin@refidim.com.br" },
      select: { passwordHash: true },
    });
    return u?.passwordHash.startsWith("$2") || "não é bcrypt";
  });

  await test("verifyPassword funciona com senha do seed", async () => {
    const u = await prisma.user.findUnique({
      where: { email: "admin@refidim.com.br" },
      select: { passwordHash: true },
    });
    if (!u) return "user não encontrado";
    const ok = await bcrypt.compare("refidim123", u.passwordHash);
    return ok || "senha do seed não bate";
  });

  await test("consultor Refidim Comercial existe", async () => {
    const c = await prisma.consultant.findFirst({
      where: { name: "Refidim Comercial" },
    });
    return !!c || "seed não populou consultor";
  });

  await test("contexto do negócio tem objeções", async () => {
    const ctx = await prisma.businessContext.findFirst({
      where: { consultant: { name: "Refidim Comercial" } },
    });
    if (!ctx) return "contexto não encontrado";
    const objections = ctx.commonObjections as Array<unknown> | null;
    return (objections?.length ?? 0) >= 5 || `só tem ${objections?.length} objeções`;
  });

  await test("permissões: canMentionPrice = false por padrão", async () => {
    const p = await prisma.consultantPermission.findFirst({
      where: { consultant: { name: "Refidim Comercial" } },
    });
    return p?.canMentionPrice === false || "deveria ser false (alerta amarelo do spec)";
  });

  await test("5 aberturas variantes cadastradas", async () => {
    const count = await prisma.openingTemplate.count({
      where: { consultant: { name: "Refidim Comercial" } },
    });
    return count === 5 || `got ${count}`;
  });

  await test("referenceMessages (few-shot) tem 5 exemplos", async () => {
    const ctx = await prisma.businessContext.findFirst({
      where: { consultant: { name: "Refidim Comercial" } },
    });
    const refs = ctx?.referenceMessages as Array<unknown> | null;
    return (refs?.length ?? 0) === 5 || `got ${refs?.length}`;
  });

  await test("referenceMessages têm scenario/message/lesson", async () => {
    const ctx = await prisma.businessContext.findFirst({
      where: { consultant: { name: "Refidim Comercial" } },
    });
    const refs = (ctx?.referenceMessages as Array<{ scenario?: string; message?: string; lesson?: string }> | null) ?? [];
    const valid = refs.every((r) => r.scenario && r.message && r.lesson);
    return valid || "estrutura faltando campos";
  });

  await test("subscription do seed: plano SCALE", async () => {
    const sub = await prisma.subscription.findFirst({
      where: { user: { email: "admin@refidim.com.br" } },
    });
    return sub?.plan === "SCALE" || `got ${sub?.plan}`;
  });
}

async function testPromptBuilder() {
  group("System prompt builder");

  // Busca um consultor real para testar
  const consultant = await prisma.consultant.findFirst({
    where: { name: "Refidim Comercial" },
    include: { context: true, permissions: true, materials: true },
  });

  if (!consultant) {
    results.push({
      group: currentGroup,
      name: "consultant disponível",
      pass: false,
      detail: "consultor seed não encontrado",
    });
    console.log("  \x1b[31m✗\x1b[0m consultor seed não encontrado — skipping prompt tests");
    return;
  }

  const prompt = buildSystemPrompt({
    consultant,
    context: consultant.context,
    permissions: consultant.permissions,
    materials: consultant.materials,
    contactName: "João",
  });

  await test("inclui nome e empresa do consultor", () =>
    prompt.includes(consultant.name) && prompt.includes(consultant.company) ||
    "faltando nome/empresa");

  await test("inclui contexto: o que vende", () =>
    consultant.context ? prompt.includes(consultant.context.whatYouSell) : false ||
    "faltando whatYouSell");

  await test("inclui objeções do contexto", () => {
    const objections = (consultant.context?.commonObjections as Array<{ objection: string }>) ?? [];
    if (objections.length === 0) return "sem objeções";
    return prompt.includes(objections[0]!.objection) || "objeção não incluída";
  });

  await test("inclui regra: NÃO PODE falar preço", () =>
    prompt.includes("NÃO PODE falar valores") ||
    prompt.includes("não pode") ||
    "regra de preço não aplicada");

  await test("inclui regras universais (mensagens curtas)", () =>
    prompt.includes("curtas") || "regra universal não aplicada");

  await test("inclui regra de honestidade sobre IA", () =>
    prompt.includes("bot") || prompt.includes("IA") ||
    "regra de honestidade não aplicada");

  await test("inclui glossário allowed e blocked", () =>
    prompt.includes("PODE usar") && prompt.includes("NUNCA pode usar") ||
    "glossário ausente");

  await test("inclui nome do contato (com moderação)", () =>
    prompt.includes("João") || "nome do contato não incluído");

  await test("inclui seção 'Exemplos do tom ideal' (few-shot)", () =>
    prompt.includes("Exemplos do tom ideal") || "few-shot ausente");

  await test("inclui pelo menos 1 cenário dos exemplos", () =>
    prompt.includes("Cenário:") || "estrutura de cenário ausente");

  await test("inclui lição (por que funciona)", () =>
    prompt.includes("Por que funciona:") || "lições ausentes");
}

async function testSubscriptionGate() {
  group("Gate de assinatura (canUsePaidFeatures)");

  // Reimplementação inline da função para testar (web/lib/subscription.ts)
  const ALLOWED = new Set(["ACTIVE", "TRIAL"]);
  function canUse(sub: { status: string; currentPeriodEnd: Date } | null): boolean {
    if (!sub) return false;
    if (!ALLOWED.has(sub.status)) return false;
    if (sub.currentPeriodEnd < new Date()) return false;
    return true;
  }

  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 1000);

  await test("ACTIVE + futuro = true", () =>
    canUse({ status: "ACTIVE", currentPeriodEnd: future }) === true || "deveria ser true");

  await test("TRIAL + futuro = true", () =>
    canUse({ status: "TRIAL", currentPeriodEnd: future }) === true || "deveria ser true");

  await test("PAST_DUE + futuro = false", () =>
    canUse({ status: "PAST_DUE", currentPeriodEnd: future }) === false || "deveria ser false");

  await test("CANCELED = false", () =>
    canUse({ status: "CANCELED", currentPeriodEnd: future }) === false || "deveria ser false");

  await test("ACTIVE + vencido no passado = false", () =>
    canUse({ status: "ACTIVE", currentPeriodEnd: past }) === false || "deveria ser false");

  await test("null = false", () =>
    canUse(null) === false || "deveria ser false");
}

async function testWebhookHandler() {
  group("Webhook NextGo Pay");

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@refidim.com.br" },
  });
  if (!adminUser) {
    console.log("  \x1b[33m⚠\x1b[0m admin não encontrado, pulando webhook");
    return;
  }

  // Limpa pagamentos antigos de teste
  await prisma.payment.deleteMany({
    where: {
      userId: adminUser.id,
      nextGoPaymentId: { startsWith: "auto-test-" },
    },
  });

  const paymentId = `auto-test-${Date.now()}`;

  await test("POST webhook payment.paid → 200", async () => {
    const r = await fetch("http://localhost:3000/api/webhooks/nextgo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "payment.paid",
        payment_id: paymentId,
        user_email: "admin@refidim.com.br",
        amount: 197,
        paid_at: new Date().toISOString(),
        description: "Test Pro mensal",
      }),
    });
    return r.status === 200 || `status ${r.status}`;
  });

  await test("Payment criado no banco", async () => {
    const p = await prisma.payment.findUnique({
      where: { nextGoPaymentId: paymentId },
    });
    return p?.status === "PAID" || `status ${p?.status}`;
  });

  await test("Subscription virou ACTIVE", async () => {
    const sub = await prisma.subscription.findFirst({
      where: { userId: adminUser.id },
    });
    return sub?.status === "ACTIVE" || `got ${sub?.status}`;
  });

  // Testa overdue
  const overdueId = `auto-test-overdue-${Date.now()}`;
  await test("POST webhook payment.overdue → 200", async () => {
    const r = await fetch("http://localhost:3000/api/webhooks/nextgo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "payment.overdue",
        payment_id: overdueId,
        user_email: "admin@refidim.com.br",
        amount: 197,
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    return r.status === 200 || `status ${r.status}`;
  });

  await test("Subscription virou PAST_DUE após overdue", async () => {
    const sub = await prisma.subscription.findFirst({
      where: { userId: adminUser.id },
    });
    return sub?.status === "PAST_DUE" || `got ${sub?.status}`;
  });

  await test("POST webhook sem JSON válido → 400", async () => {
    const r = await fetch("http://localhost:3000/api/webhooks/nextgo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    return r.status === 400 || `status ${r.status}`;
  });

  // Restaura subscription para não bagunçar testes manuais
  await prisma.subscription.updateMany({
    where: { userId: adminUser.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.payment.deleteMany({
    where: {
      userId: adminUser.id,
      nextGoPaymentId: { startsWith: "auto-test-" },
    },
  });
}

async function testHttpRoutes() {
  group("Rotas HTTP");

  await test("GET / → 200", async () => {
    const r = await fetch("http://localhost:3000/");
    return r.status === 200 || `status ${r.status}`;
  });

  await test("GET /login → 200", async () => {
    const r = await fetch("http://localhost:3000/login");
    return r.status === 200 || `status ${r.status}`;
  });

  await test("GET /cadastro → 200", async () => {
    const r = await fetch("http://localhost:3000/cadastro");
    return r.status === 200 || `status ${r.status}`;
  });

  await test("GET /painel sem auth → 307 → /login", async () => {
    const r = await fetch("http://localhost:3000/painel", { redirect: "manual" });
    return (r.status === 307 && r.headers.get("location") === "/login") ||
      `status ${r.status} loc ${r.headers.get("location")}`;
  });

  await test("GET /api/whatsapp/status sem auth → 401", async () => {
    const r = await fetch("http://localhost:3000/api/whatsapp/status");
    return r.status === 401 || `status ${r.status}`;
  });
}

async function summary() {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log("\n" + "─".repeat(60));
  console.log(
    `\x1b[1m${passed}/${total} testes passaram\x1b[0m  (${failed} falhas)`
  );

  if (failed > 0) {
    console.log("\n\x1b[31mFalhas:\x1b[0m");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  ✗ [${r.group}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }

  return { total, passed, failed, results };
}

async function main() {
  console.log("\x1b[1mRefidim — Test Suite\x1b[0m");
  console.log(new Date().toISOString());

  await testConstants();
  await testPlans();
  await testCrypto();
  await testSchemas();
  await testSendWindow();
  await testDatabase();
  await testPromptBuilder();
  await testSubscriptionGate();
  await testHttpRoutes();
  await testWebhookHandler();

  const s = await summary();
  await prisma.$disconnect();
  process.exit(s.failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\n\x1b[31mErro fatal:\x1b[0m", err);
  await prisma.$disconnect();
  process.exit(1);
});
