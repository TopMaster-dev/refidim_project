import { redirect } from "next/navigation";
import type { Subscription } from "@refidim/database";

/**
 * Estados que permitem usar features pagas.
 */
const ALLOWED_STATUSES = new Set(["ACTIVE", "TRIAL"]);

export function canUsePaidFeatures(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  if (!ALLOWED_STATUSES.has(sub.status)) return false;
  if (sub.currentPeriodEnd < new Date()) return false;
  return true;
}

/**
 * Redireciona para /painel/conta se a assinatura não permite ações pagas.
 * Use em server actions críticas (criar trabalho, conectar canal, etc).
 */
export function requirePaidSubscription(sub: Subscription | null | undefined): void {
  if (!canUsePaidFeatures(sub)) {
    redirect("/painel/conta?reason=payment");
  }
}
