"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@refidim/database";
import { type PlanTier } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, getPriceIdForPlan, hasStripe } from "@/lib/stripe";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function getBaseUrl(): string {
  const env = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (env) return env;
  // Fallback: pega do header
  return "http://localhost:3000";
}

/**
 * Cria uma Checkout Session do Stripe e redireciona o usuário.
 */
export async function createCheckoutAction(plan: PlanTier): Promise<{ error?: string }> {
  const user = await requireUser();

  if (!hasStripe()) {
    return {
      error: "Stripe não configurado. Configure STRIPE_SECRET_KEY no .env e os price IDs dos planos.",
    };
  }

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) {
    return {
      error: `Price ID do plano ${plan} não configurado (STRIPE_PRICE_${plan}).`,
    };
  }

  const stripe = getStripe();
  const baseUrl = getBaseUrl();

  // Reutiliza customer se já existe
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/painel/conta?status=success`,
    cancel_url: `${baseUrl}/painel/conta?status=cancel`,
    allow_promotion_codes: true,
    metadata: { userId: user.id, plan },
  });

  if (!session.url) {
    return { error: "Não foi possível criar a sessão de checkout" };
  }

  redirect(session.url);
}

/**
 * Cria uma sessão do Customer Portal e redireciona.
 */
export async function openCustomerPortalAction(): Promise<{ error?: string }> {
  const user = await requireUser();

  if (!hasStripe()) {
    return { error: "Stripe não configurado" };
  }

  if (!user.stripeCustomerId) {
    return {
      error:
        "Você ainda não tem um cliente Stripe associado. Faça uma assinatura primeiro.",
    };
  }

  const stripe = getStripe();
  const baseUrl = getBaseUrl();

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/painel/conta`,
  });

  redirect(portal.url);
}
