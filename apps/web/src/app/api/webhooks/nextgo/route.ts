import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma, PaymentStatus, SubscriptionStatus } from "@refidim/database";

export const dynamic = "force-dynamic";

/**
 * Webhook genérico para o NextGo Pay.
 * Aceita um payload JSON e mapeia para Payment + atualiza Subscription.
 *
 * Esperado (esquema provisório — ajustar conforme doc oficial):
 * {
 *   "event": "payment.paid" | "payment.pending" | "payment.overdue" |
 *            "subscription.canceled" | "payment.refunded",
 *   "payment_id": "...",
 *   "subscription_id": "...",
 *   "user_email": "...",
 *   "amount": 197.00,
 *   "due_date": "2026-06-01",
 *   "paid_at": "2026-05-17T10:00:00Z"
 * }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.NEXTGO_WEBHOOK_SECRET;
  const signature = req.headers.get("x-nextgo-signature");
  const body = await req.text();

  // Valida HMAC se secret estiver configurado
  if (secret) {
    if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 401 });
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let payload: NextGoPayload;
  try {
    payload = JSON.parse(body) as NextGoPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await processEvent(payload);
  return NextResponse.json({ ok: true });
}

interface NextGoPayload {
  event: string;
  payment_id?: string;
  subscription_id?: string;
  user_email?: string;
  amount?: number;
  due_date?: string;
  paid_at?: string;
  description?: string;
}

async function processEvent(p: NextGoPayload) {
  const user = p.user_email
    ? await prisma.user.findUnique({
        where: { email: p.user_email.toLowerCase() },
        include: { subscription: true },
      })
    : null;

  if (!user) return; // ignora silenciosamente — pode ser usuário ainda não cadastrado

  // Mapeamento de evento → status
  const status = mapEventToPaymentStatus(p.event);
  const subStatus = mapEventToSubscriptionStatus(p.event);

  if (p.payment_id) {
    await prisma.payment.upsert({
      where: { nextGoPaymentId: p.payment_id },
      update: {
        status,
        paidAt: p.paid_at ? new Date(p.paid_at) : undefined,
        rawPayload: p as unknown as object,
      },
      create: {
        userId: user.id,
        nextGoPaymentId: p.payment_id,
        amount: p.amount ?? 0,
        status,
        description: p.description ?? p.event,
        paidAt: p.paid_at ? new Date(p.paid_at) : null,
        dueAt: p.due_date ? new Date(p.due_date) : null,
        rawPayload: p as unknown as object,
      },
    });
  }

  if (user.subscription && subStatus) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: { status: subStatus },
    });
  }
}

function mapEventToPaymentStatus(event: string): PaymentStatus {
  if (event.endsWith("paid")) return PaymentStatus.PAID;
  if (event.endsWith("pending")) return PaymentStatus.PENDING;
  if (event.endsWith("overdue")) return PaymentStatus.OVERDUE;
  if (event.endsWith("canceled")) return PaymentStatus.CANCELED;
  if (event.endsWith("refunded")) return PaymentStatus.REFUNDED;
  return PaymentStatus.PENDING;
}

function mapEventToSubscriptionStatus(event: string): SubscriptionStatus | null {
  if (event === "payment.paid") return SubscriptionStatus.ACTIVE;
  if (event === "payment.overdue") return SubscriptionStatus.PAST_DUE;
  if (event === "subscription.canceled") return SubscriptionStatus.CANCELED;
  return null;
}
