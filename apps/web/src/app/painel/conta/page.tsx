import { prisma } from "@refidim/database";
import { PLAN_CONFIGS, ALL_PLANS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Período de teste",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  TRIAL: "bg-blue-100 text-blue-800",
  PAST_DUE: "bg-red-100 text-red-800",
  CANCELED: "bg-gray-200 text-gray-700",
};

const PAYMENT_LABELS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const PAYMENT_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-200 text-gray-700",
  REFUNDED: "bg-blue-100 text-blue-700",
};

interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function ContaPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const blocked = sp.reason === "payment";

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const plan = user.subscription ? PLAN_CONFIGS[user.subscription.plan] : null;
  const sub = user.subscription;
  const canUse = canUsePaidFeatures(sub);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Conta &amp; Plano</h1>
        <p className="mt-1 text-navy-600">Gerencie sua assinatura e veja seu histórico de pagamentos.</p>
      </header>

      {blocked && !canUse && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold">Sua assinatura precisa ser regularizada para continuar.</p>
          <p className="mt-1">Regularize o pagamento ou troque de plano abaixo para liberar suas operações.</p>
        </div>
      )}

      {/* Plano atual */}
      {plan && sub && (
        <section className="rounded-2xl border border-navy-100 bg-white shadow-soft">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
                Plano {plan.label}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
                {STATUS_LABELS[sub.status]}
              </span>
            </div>
            <span className="text-lg font-bold text-navy-900">
              {formatBRL(plan.monthlyPriceBRL)}<span className="text-sm font-normal text-navy-500">/mês</span>
            </span>
          </header>

          <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-3">
            <Detail label="Leads usados / total" value={`${sub.leadsUsed.toLocaleString("pt-BR")} / ${plan.leadLimit.toLocaleString("pt-BR")}`} />
            <Detail
              label="Consultores"
              value={plan.consultantLimit === 999 ? "Ilimitados" : `${plan.consultantLimit}`}
            />
            <Detail label="Renovação" value={formatDate(sub.currentPeriodEnd)} />
          </div>
        </section>
      )}

      {/* Faturas */}
      <section className="rounded-2xl border border-navy-100 bg-white shadow-soft">
        <header className="border-b border-navy-100 px-6 py-4">
          <h2 className="font-semibold text-navy-900">Faturas</h2>
        </header>

        {payments.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-navy-500">Nenhuma fatura ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 bg-navy-50/40 text-left text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Vencimento</th>
                <th className="px-6 py-3">Pago em</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 text-navy-800">{p.description ?? "—"}</td>
                  <td className="px-6 py-3 font-medium text-navy-900">{formatBRL(Number(p.amount))}</td>
                  <td className="px-6 py-3 text-navy-600">{p.dueAt ? formatDate(p.dueAt) : "—"}</td>
                  <td className="px-6 py-3 text-navy-600">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLES[p.status]}`}>
                      {PAYMENT_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Trocar plano */}
      <section>
        <h2 className="text-lg font-semibold text-navy-900">Trocar de plano</h2>
        <p className="mt-1 text-sm text-navy-600">
          A troca é processada pelo NextGo Pay. Você será redirecionado para concluir.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ALL_PLANS.map((p) => {
            const current = sub?.plan === p.tier;
            return (
              <div
                key={p.tier}
                className={
                  current
                    ? "rounded-2xl border-2 border-brand-500 bg-brand-50/40 p-6 shadow-soft"
                    : "rounded-2xl border border-navy-200 bg-white p-6 shadow-soft"
                }
              >
                <h3 className="text-xl font-bold text-navy-900">{p.label}</h3>
                <p className="mt-3 text-3xl font-bold text-navy-900">
                  {formatBRL(p.monthlyPriceBRL)}
                  <span className="text-sm font-normal text-navy-500">/mês</span>
                </p>
                <ul className="mt-4 space-y-1 text-sm text-navy-700">
                  <li>· {p.leadLimit.toLocaleString("pt-BR")} leads/mês</li>
                  <li>· {p.consultantLimit === 999 ? "Consultores ilimitados" : `${p.consultantLimit} consultor(es)`}</li>
                </ul>
                <Button asChild variant={current ? "outline" : "gradient"} className="mt-6 w-full" disabled={current}>
                  <a
                    href={
                      process.env.NEXT_PUBLIC_NEXTGO_CHECKOUT_URL
                        ? `${process.env.NEXT_PUBLIC_NEXTGO_CHECKOUT_URL}?plan=${p.tier.toLowerCase()}&email=${encodeURIComponent(user.email)}`
                        : "#"
                    }
                  >
                    {current ? "Plano atual" : "Trocar"}
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-navy-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy-900">{value}</p>
    </div>
  );
}
