/**
 * Bootstrap Stripe — cria os 3 produtos e preços recorrentes no Stripe
 * para os planos Start / Pro / Scale do Refidim.
 *
 * Uso:
 *   1. Crie/abra sua conta em https://dashboard.stripe.com (TEST mode por padrão)
 *   2. Copie sua Secret key em Developers → API keys (começa com sk_test_)
 *   3. Coloque-a no .env como STRIPE_SECRET_KEY
 *   4. Rode: pnpm --filter @refidim/worker exec tsx scripts/stripe-bootstrap.ts
 *
 * O script imprime os Price IDs prontos para colar no .env.
 * É idempotente — se já existirem produtos com mesmo nome, reaproveita.
 */

import "dotenv/config";
import Stripe from "stripe";
import { PLAN_CONFIGS } from "@refidim/shared";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("\x1b[31m✗ STRIPE_SECRET_KEY não definido no .env\x1b[0m");
  console.error("  Adicione: STRIPE_SECRET_KEY=\"sk_test_xxx\"");
  console.error("  Pegue em: https://dashboard.stripe.com/test/apikeys");
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: "2026-04-22.dahlia", typescript: true });

async function findOrCreateProduct(name: string, description: string): Promise<Stripe.Product> {
  // Procura por produto com mesmo nome (Stripe não tem unique por name, então listamos)
  const existing = await stripe.products.list({ limit: 100, active: true });
  const match = existing.data.find((p) => p.name === name);
  if (match) {
    console.log(`  • Produto já existe: ${name} (${match.id})`);
    return match;
  }
  const created = await stripe.products.create({ name, description });
  console.log(`  + Produto criado: ${name} (${created.id})`);
  return created;
}

async function findOrCreatePrice(
  productId: string,
  amountBRL: number,
  lookupKey: string
): Promise<Stripe.Price> {
  // Procura por price recurring com o lookup_key
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  const match = existing.data.find(
    (p) =>
      p.lookup_key === lookupKey &&
      p.recurring?.interval === "month" &&
      p.unit_amount === amountBRL * 100
  );
  if (match) {
    console.log(`    • Price já existe: ${match.id} (${formatBRL(amountBRL)}/mês)`);
    return match;
  }
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: amountBRL * 100,
    currency: "brl",
    recurring: { interval: "month" },
    lookup_key: lookupKey,
  });
  console.log(`    + Price criado: ${created.id} (${formatBRL(amountBRL)}/mês)`);
  return created;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

async function main() {
  console.log("\x1b[1mRefidim — Stripe Bootstrap\x1b[0m");
  console.log("Modo:", secret.startsWith("sk_test_") ? "\x1b[33mTEST\x1b[0m" : "\x1b[31mLIVE\x1b[0m");
  console.log("");

  const ids: Record<string, string> = {};

  for (const cfg of Object.values(PLAN_CONFIGS)) {
    console.log(`Plano ${cfg.label}:`);

    const description = `Refidim plano ${cfg.label} — ${cfg.leadLimit.toLocaleString("pt-BR")} leads/mês · ${
      cfg.consultantLimit === 999 ? "consultores ilimitados" : `${cfg.consultantLimit} consultor(es)`
    }`;

    const product = await findOrCreateProduct(`Refidim ${cfg.label}`, description);
    const price = await findOrCreatePrice(
      product.id,
      cfg.monthlyPriceBRL,
      `refidim_${cfg.tier.toLowerCase()}_monthly`
    );

    ids[cfg.tier] = price.id;
    console.log("");
  }

  console.log("\x1b[32m✓ Bootstrap concluído\x1b[0m\n");
  console.log("\x1b[1mCole estas linhas no seu .env:\x1b[0m\n");
  console.log(`STRIPE_PRICE_START="${ids.START}"`);
  console.log(`STRIPE_PRICE_PRO="${ids.PRO}"`);
  console.log(`STRIPE_PRICE_SCALE="${ids.SCALE}"`);
  console.log("");
  console.log("Próximos passos:");
  console.log("  1. Cole as linhas acima no .env");
  console.log("  2. Em outro terminal: stripe listen --forward-to localhost:3000/api/webhooks/stripe");
  console.log("  3. Copie o whsec_xxx que a CLI imprimir para STRIPE_WEBHOOK_SECRET no .env");
  console.log("  4. Reinicie o servidor web e teste em /painel/conta");
}

main().catch((err) => {
  console.error("\x1b[31mErro:\x1b[0m", err instanceof Error ? err.message : err);
  process.exit(1);
});
