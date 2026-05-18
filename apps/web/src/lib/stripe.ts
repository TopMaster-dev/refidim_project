import Stripe from "stripe";
import type { PlanTier } from "@refidim/shared";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY não configurada — adicione no .env");
  }
  stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return stripe;
}

export function hasStripe(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getPriceIdForPlan(plan: PlanTier): string | null {
  const map: Record<PlanTier, string | undefined> = {
    START: process.env.STRIPE_PRICE_START,
    PRO: process.env.STRIPE_PRICE_PRO,
    SCALE: process.env.STRIPE_PRICE_SCALE,
  };
  return map[plan] || null;
}

export function planFromPriceId(priceId: string): PlanTier | null {
  if (priceId === process.env.STRIPE_PRICE_START) return "START";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_SCALE) return "SCALE";
  return null;
}
