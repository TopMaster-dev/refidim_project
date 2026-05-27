import Link from "next/link";
import { prisma } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { OnboardingWizard } from "./onboarding-wizard";
import { ActivityFeed } from "./activity-feed";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Período de teste",
  PAST_DUE: "Vencida",
  CANCELED: "Cancelada",
};

const STATUS_VARIANT: Record<string, "success" | "brand" | "danger" | "neutral"> = {
  ACTIVE: "success",
  TRIAL: "brand",
  PAST_DUE: "danger",
  CANCELED: "neutral",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const plan = user.subscription ? PLAN_CONFIGS[user.subscription.plan] : null;
  const sub = user.subscription;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    consultantsCount,
    jobsRunning,
    leadCounts,
    recentAlerts,
    last7DaysMessages,
    topJobs,
    sentToday,
    receivedToday,
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
    prisma.message.count({
      where: {
        direction: "OUTBOUND",
        sentAt: { gte: startOfToday },
        conversation: { lead: { job: { userId: user.id } } },
      },
    }),
    prisma.message.count({
      where: {
        direction: "INBOUND",
        sentAt: { gte: startOfToday },
        conversation: { lead: { job: { userId: user.id } } },
      },
    }),
  ]);

  // Estado do onboarding (pra wizard de 4 passos)
  const [hasChannel, listsCount, jobsCount] = await Promise.all([
    Promise.all([
      prisma.whatsAppSession.findFirst({
        where: { userId: user.id, status: "CONNECTED" },
        select: { id: true },
      }),
      prisma.emailAccount.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true },
      }),
    ]).then(([wa, em]) => !!(wa || em)),
    prisma.contactList.count({ where: { userId: user.id } }),
    prisma.job.count({ where: { userId: user.id } }),
  ]);
  const onboardingState = {
    hasConsultant: consultantsCount > 0,
    hasChannel,
    hasList: listsCount > 0,
    hasJob: jobsCount > 0,
  };

  const hotLeads = leadCounts.find((l) => l.status === "HOT")?._count ?? 0;
  const warmLeads = leadCounts.find((l) => l.status === "WARM")?._count ?? 0;
  const coldLeads = leadCounts.find((l) => l.status === "COLD")?._count ?? 0;

  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = last7DaysMessages.filter((m) => m.sentAt >= day && m.sentAt < next).length;
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      value: count,
      iso: day.toISOString(),
      dayNum: day.getDate(),
    };
  });
  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.value));

  const usagePct = sub ? Math.round((sub.leadsUsed / sub.leadLimit) * 100) : 0;

  const sortedTopJobs = topJobs
    .map((j) => ({ ...j, hotCount: j.leads.length }))
    .sort((a, b) => b.hotCount - a.hotCount)
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow={`Olá, ${user.name.split(" ")[0]}`}
        title="Visão geral"
        description="Resumo das suas operações em tempo real."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/painel/canais">Canais</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/painel/trabalhos/novo">+ Novo trabalho</Link>
            </Button>
          </>
        }
      />

      {/* Onboarding wizard — some quando todos os 4 passos estão completos */}
      <OnboardingWizard state={onboardingState} />

      {/* Plano */}
      {plan && sub && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-brand-50/40 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                Plano {plan.label}
              </span>
              <Badge variant={STATUS_VARIANT[sub.status]} dot>
                {STATUS_LABELS[sub.status]}
              </Badge>
            </div>
            <Link href="/painel/conta" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Gerenciar plano →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Uso do mês</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular">
                {sub.leadsUsed.toLocaleString("pt-BR")}
                <span className="ml-1 text-base font-normal text-slate-400">
                  / {plan.leadLimit.toLocaleString("pt-BR")} leads
                </span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-gradient transition-all"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{usagePct}% usado</p>
            </div>
            <Detail label="Consultores permitidos" value={plan.consultantLimit === 999 ? "Ilimitados" : `${plan.consultantLimit}`} />
            <Detail label="Renovação em" value={new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(sub.currentPeriodEnd)} />
          </div>
        </div>
      )}

      {/* Atividade de hoje — destaque pra dar sensação de "está acontecendo agora" */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/40 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500" />
            </span>
            <p className="text-sm font-semibold text-slate-900">Atividade de hoje</p>
            <span className="text-xs text-slate-500">
              · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
            </span>
          </div>
          <div className="flex flex-wrap gap-6">
            <DayCounter label="Enviadas" value={sentToday} tone="brand" />
            <DayCounter label="Recebidas" value={receivedToday} tone="success" />
            <DayCounter label="Quentes" value={hotLeads} tone="danger" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Consultores ativos" value={consultantsCount} icon={<UsersIconSmall />} accent="brand" />
        <Stat label="Trabalhos rodando" value={jobsRunning} icon={<PlayIconSmall />} accent="brand" />
        <Stat label="Leads frios" value={coldLeads} accent="default" />
        <Stat label="Leads mornos" value={warmLeads} accent="warning" />
        <Stat label="Leads quentes" value={hotLeads} accent="danger" pulse={hotLeads > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mensagens nos últimos 7 dias</CardTitle>
              <p className="mt-1 text-sm text-slate-500">{last7DaysMessages.length} no total</p>
            </div>
            <Badge variant="neutral">Tempo real</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2.5">
              {dailyCounts.map((d) => {
                const h = Math.max(4, (d.value / maxCount) * 160);
                return (
                  <div key={d.iso} className="group flex flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all group-hover:from-brand-600 group-hover:to-brand-500"
                        style={{ height: `${h}px` }}
                        title={`${d.value} mensagens`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-700">{d.label}</p>
                      <p className="text-2xs text-slate-400 tabular">{d.dayNum}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Alertas</CardTitle>
            {recentAlerts.length > 0 && (
              <Badge variant="danger" size="sm">
                {recentAlerts.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-600">
                  ✓
                </div>
                <p className="mt-3 text-sm text-slate-500">Nenhum alerta no momento</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentAlerts.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/painel/leads/${a.leadId}`}
                      className="block rounded-lg border border-danger-200 bg-danger-50/60 p-3 transition-colors hover:bg-danger-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-base">🔥</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {a.lead.contact.name ?? a.lead.contact.phone ?? a.lead.contact.email}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{a.message}</p>
                          <p className="mt-1 text-2xs text-slate-400">{formatDate(a.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feed ao vivo */}
      <ActivityFeed />

      {/* Top jobs */}
      {sortedTopJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Trabalhos com mais oportunidades</CardTitle>
            <Link href="/painel/trabalhos" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Ver todos →
            </Link>
          </CardHeader>
          <ul className="divide-y divide-slate-100">
            {sortedTopJobs.map((j, i) => (
              <li key={j.id}>
                <Link
                  href={`/painel/trabalhos/${j.id}`}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-300 tabular">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-medium text-slate-900">{j.name}</p>
                      <p className="text-sm text-slate-500">{j.consultant.name}</p>
                    </div>
                  </div>
                  <Badge variant="danger" size="lg">
                    {j.hotCount} {j.hotCount === 1 ? "quente" : "quentes"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular">{value}</p>
    </div>
  );
}

function DayCounter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "success" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-danger-700"
      : tone === "success"
        ? "text-success-700"
        : "text-brand-700";
  return (
    <div className="flex items-baseline gap-1.5">
      <p className={`text-xl font-bold tabular ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function UsersIconSmall() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function PlayIconSmall() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
