import Link from "next/link";
import { prisma } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Trial",
  PAST_DUE: "Vencida",
  CANCELED: "Cancelada",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const plan = user.subscription ? PLAN_CONFIGS[user.subscription.plan] : null;
  const sub = user.subscription;

  // Métricas agregadas em paralelo
  const [
    consultantsCount,
    jobsRunning,
    leadCounts,
    recentAlerts,
    last7DaysMessages,
    topJobs,
  ] = await Promise.all([
    prisma.consultant.count({ where: { userId: user.id, isActive: true } }),
    prisma.job.count({ where: { userId: user.id, status: "RUNNING" } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { job: { userId: user.id } },
      _count: true,
    }),
    prisma.alert.findMany({
      where: { userId: user.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lead: { include: { contact: true } } },
    }),
    prisma.message.findMany({
      where: {
        sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        conversation: { lead: { job: { userId: user.id } } },
      },
      select: { sentAt: true, direction: true },
    }),
    prisma.job.findMany({
      where: { userId: user.id, status: "RUNNING" },
      include: {
        leads: { where: { status: "HOT" }, select: { id: true } },
        consultant: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  const hotLeads = leadCounts.find((l) => l.status === "HOT")?._count ?? 0;
  const warmLeads = leadCounts.find((l) => l.status === "WARM")?._count ?? 0;
  const coldLeads = leadCounts.find((l) => l.status === "COLD")?._count ?? 0;
  const handedOff = leadCounts.find((l) => l.status === "HANDED_OFF")?._count ?? 0;

  // Histograma dos últimos 7 dias
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = last7DaysMessages.filter(
      (m) => m.sentAt >= day && m.sentAt < next
    ).length;
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      value: count,
      iso: day.toISOString(),
    };
  });
  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.value));

  const usagePct = sub ? Math.round((sub.leadsUsed / sub.leadLimit) * 100) : 0;

  // Top jobs ordenados por leads HOT
  const sortedTopJobs = topJobs
    .map((j) => ({ ...j, hotCount: j.leads.length }))
    .sort((a, b) => b.hotCount - a.hotCount)
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-navy-900">
            Olá, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-navy-600">
            Bem-vindo ao painel. Aqui está o resumo das suas operações.
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/painel/trabalhos/novo">+ Novo trabalho</Link>
        </Button>
      </header>

      {/* Plano */}
      {plan && sub && (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
                Plano {plan.label}
              </div>
              <span
                className={
                  sub.status === "ACTIVE"
                    ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                    : sub.status === "TRIAL"
                      ? "rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                }
              >
                {STATUS_LABELS[sub.status]}
              </span>
            </div>
            <Link href="/painel/conta" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Gerenciar →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-500">Leads do mês</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">
                {sub.leadsUsed.toLocaleString("pt-BR")}
                <span className="ml-1 text-base font-normal text-navy-500">
                  / {plan.leadLimit.toLocaleString("pt-BR")}
                </span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full bg-brand-gradient transition-all"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            </div>
            <Detail
              label="Consultores permitidos"
              value={plan.consultantLimit === 999 ? "Ilimitados" : `${plan.consultantLimit}`}
            />
            <Detail
              label="Renovação em"
              value={new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(
                sub.currentPeriodEnd
              )}
            />
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Consultores ativos" value={consultantsCount} accent="brand" />
        <StatCard label="Trabalhos rodando" value={jobsRunning} accent="brand" />
        <StatCard label="Leads frios" value={coldLeads} accent="gray" />
        <StatCard label="Leads mornos" value={warmLeads} accent="yellow" />
        <StatCard label="Leads quentes" value={hotLeads} accent="red" badge={hotLeads > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Atividade da semana */}
        <section className="lg:col-span-2 rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Mensagens nos últimos 7 dias</h2>
            <span className="text-sm text-navy-500">
              {last7DaysMessages.length} no total
            </span>
          </header>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {dailyCounts.map((d) => {
              const h = Math.max(8, (d.value / maxCount) * 160);
              return (
                <div key={d.iso} className="flex flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-brand-gradient transition-all hover:opacity-90"
                      style={{ height: `${h}px` }}
                      title={`${d.value} mensagens`}
                    />
                  </div>
                  <p className="text-xs font-medium text-navy-700">{d.label}</p>
                  <p className="text-xs text-navy-500">{d.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alertas recentes */}
        <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Alertas não lidos</h2>
            {recentAlerts.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                {recentAlerts.length}
              </span>
            )}
          </header>

          {recentAlerts.length === 0 ? (
            <p className="mt-4 text-sm text-navy-500">Nenhum alerta no momento ✨</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentAlerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/painel/leads/${a.leadId}`}
                    className="block rounded-xl border border-red-200 bg-red-50 p-3 hover:bg-red-100"
                  >
                    <p className="text-sm font-semibold text-red-900">
                      🚨 {a.lead.contact.name ?? a.lead.contact.phone ?? a.lead.contact.email}
                    </p>
                    <p className="mt-1 text-xs text-red-700">{a.message}</p>
                    <p className="mt-1 text-xs text-red-600/70">{formatDate(a.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Top trabalhos */}
      {sortedTopJobs.length > 0 && (
        <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Trabalhos com mais oportunidades</h2>
            <Link href="/painel/trabalhos" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Ver todos →
            </Link>
          </header>

          <ul className="mt-4 divide-y divide-navy-50">
            {sortedTopJobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/painel/trabalhos/${j.id}`}
                  className="flex items-center justify-between py-3 hover:bg-navy-50/30"
                >
                  <div>
                    <p className="font-medium text-navy-900">{j.name}</p>
                    <p className="text-sm text-navy-500">{j.consultant.name}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                    {j.hotCount} {j.hotCount === 1 ? "quente" : "quentes"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty hint */}
      {consultantsCount === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-8 text-center">
          <h3 className="text-lg font-semibold text-navy-900">
            Comece criando seu primeiro consultor
          </h3>
          <p className="mt-1 text-sm text-navy-600">
            O consultor é quem vai conversar com seus leads. Configure-o em 2 minutos.
          </p>
          <Button asChild variant="gradient" className="mt-4">
            <Link href="/painel/consultores/novo">Criar consultor</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-navy-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  badge,
}: {
  label: string;
  value: number;
  accent: "brand" | "yellow" | "red" | "gray";
  badge?: boolean;
}) {
  const accents = {
    brand: "border-brand-200",
    yellow: "border-yellow-300",
    red: "border-red-300",
    gray: "border-navy-200",
  };
  return (
    <div
      className={`rounded-2xl border-t-4 ${accents[accent]} bg-white p-5 shadow-soft transition-shadow hover:shadow-elevated`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy-600">{label}</p>
        {badge && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-navy-900">{value}</p>
    </div>
  );
}
