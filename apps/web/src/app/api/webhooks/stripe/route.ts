import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { prisma, PaymentStatus, SubscriptionStatus } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getStripe, planFromPriceId } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Webhook do Stripe. Recebe eventos de assinatura e fatura.
 *
 * Eventos tratados:
 * - checkout.session.completed → cria/atualiza Subscription, vincula customer
 * - customer.subscription.updated → muda plano e período
 * - customer.subscription.deleted → CANCELED
 * - invoice.paid → Payment paid + Subscription ACTIVE
 * - invoice.payment_failed → PAST_DUE
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "stripe-signature ausente" }, { status: 401 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature inválida: ${(err as Error).message}` },
      { status: 401 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object);
        break;
      // outros eventos são ignorados silenciosamente
    }
  } catch (err) {
    console.error("Erro processando webhook Stripe:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const userEmail = session.customer_email ?? session.metadata?.userEmail;

  if (!userEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
  });
  if (!user) return;

  // Vincula customer ao usuário
  if (customerId && !user.stripeCustomerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Subscription será criada/atualizada pelos eventos subscription.* — só registra customer aqui
  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionFromStripe(user.id, sub);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;
  await syncSubscriptionFromStripe(user.id, sub);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;
  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { status: SubscriptionStatus.CANCELED },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId || !invoice.id) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  await prisma.payment.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: PaymentStatus.PAID,
      paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
      rawPayload: invoice as unknown as object,
    },
    create: {
      userId: user.id,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_paid ?? 0) / 100,
      status: PaymentStatus.PAID,
      description: invoice.lines?.data[0]?.description ?? "Assinatura",
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      rawPayload: invoice as unknown as object,
    },
  });

  // Garante assinatura ACTIVE quando fatura é paga
  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { status: SubscriptionStatus.ACTIVE },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId || !invoice.id) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  await prisma.payment.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: PaymentStatus.OVERDUE,
      rawPayload: invoice as unknown as object,
    },
    create: {
      userId: user.id,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_due ?? 0) / 100,
      status: PaymentStatus.OVERDUE,
      description: invoice.lines?.data[0]?.description ?? "Assinatura",
      dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      rawPayload: invoice as unknown as object,
    },
  });

  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { status: SubscriptionStatus.PAST_DUE },
  });
}

async function syncSubscriptionFromStripe(userId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  if (!item) return;

  const priceId = item.price.id;
  const plan = planFromPriceId(priceId);
  if (!plan) {
    console.warn("Stripe price ID não mapeado para nenhum plano:", priceId);
    return;
  }

  const planCfg = PLAN_CONFIGS[plan];
  const status = mapStripeSubStatus(sub.status);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status,
      leadLimit: planCfg.leadLimit,
      consultantLimit: planCfg.consultantLimit,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
    },
    create: {
      userId,
      plan,
      status,
      leadLimit: planCfg.leadLimit,
      consultantLimit: planCfg.consultantLimit,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
    },
  });
}

function mapStripeSubStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIAL;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.PAST_DUE;
  }
}
