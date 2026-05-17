import { prisma } from "@refidim/database";
import { PLAN_CONFIGS, ALL_PLANS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Trial",
  PAST_DUE: "Vencida",
  CANCELED: "Cancelada",
};

const STATUS_VARIANT: Record<string, "success" | "brand" | "danger" | "neutral"> = {
  ACTIVE: "success",
  TRIAL: "brand",
  PAST_DUE: "danger",
  CANCELED: "neutral",
};

const PAYMENT_LABELS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const PAYMENT_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "brand"> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "danger",
  CANCELED: "neutral",
  REFUNDED: "brand",
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
      <PageHeader
        title="Conta & Plano"
        description="Gerencie sua assinatura e veja o histórico de pagamentos."
      />

      {blocked && !canUse && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-900">
          <p className="font-semibold">Sua assinatura precisa ser regularizada para continuar.</p>
          <p className="mt-1 text-danger-700">Regularize o pagamento ou troque de plano abaixo para liberar suas operações.</p>
        </div>
      )}

      {/* Plano atual em destaque */}
      {plan && sub && (
        <Card className="overflow-hidden">
          <div className="bg-slate-950 px-6 py-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Plano {plan.label}</h2>
                <Badge variant={STATUS_VARIANT[sub.status]} dot>
                  {STATUS_LABELS[sub.status]}
                </Badge>
              </div>
              <p className="text-lg font-bold tabular">
                {formatBRL(plan.monthlyPriceBRL)}
                <span className="text-sm font-normal text-slate-400">/mês</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-3">
            <Detail label="Leads usados / total" value={`${sub.leadsUsed.toLocaleString("pt-BR")} / ${plan.leadLimit.toLocaleString("pt-BR")}`} />
            <Detail label="Consultores" value={plan.consultantLimit === 999 ? "Ilimitados" : `${plan.consultantLimit}`} />
            <Detail label="Renovação" value={formatDate(sub.currentPeriodEnd)} />
          </div>
        </Card>
      )}

      {/* Faturas */}
      <Card className="overflow-hidden p-0">
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
        </CardHeader>

        {payments.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Nenhuma fatura ainda.</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-25 text-left">
              <tr>
                <th className="px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Descrição</th>
                <th className="px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Valor</th>
                <th className="px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Vencimento</th>
                <th className="px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Pago em</th>
                <th className="px-6 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{p.description ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-slate-900 tabular">{formatBRL(Number(p.amount))}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{p.dueAt ? formatDate(p.dueAt) : "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={PAYMENT_VARIANT[p.status]} dot>{PAYMENT_LABELS[p.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Trocar plano */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Trocar de plano</h2>
          <p className="mt-1 text-sm text-slate-500">
            A troca é processada pelo NextGo Pay. Você será redirecionado para concluir.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ALL_PLANS.map((p) => {
            const current = sub?.plan === p.tier;
            return (
              <div
                key={p.tier}
                className={
                  current
                    ? "relative rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm"
                    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                }
              >
                {current && (
                  <Badge variant="dark" className="absolute -top-3 left-6">
                    Plano atual
                  </Badge>
                )}
                <h3 className="text-xl font-bold text-slate-900">{p.label}</h3>
                <p className="mt-3 text-3xl font-bold text-slate-900 tabular">
                  {formatBRL(p.monthlyPriceBRL)}
                  <span className="text-sm font-normal text-slate-500">/mês</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  <Item>{p.leadLimit.toLocaleString("pt-BR")} leads/mês</Item>
                  <Item>{p.consultantLimit === 999 ? "Consultores ilimitados" : `${p.consultantLimit} consultor(es)`}</Item>
                </ul>
                <Button asChild variant={current ? "outline" : "primary"} size="lg" className="mt-6 w-full" disabled={current}>
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
      <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-slate-900 tabular">{value}</p>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.296a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      {children}
    </li>
  );
}
