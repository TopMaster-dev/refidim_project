import Link from "next/link";
import { prisma } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

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

  // Métricas
  const [consultantsCount, jobsCount, hotLeadsCount, warmLeadsCount] = await Promise.all([
    prisma.consultant.count({ where: { userId: user.id, isActive: true } }),
    prisma.job.count({ where: { userId: user.id, status: "RUNNING" } }),
    prisma.lead.count({
      where: { job: { userId: user.id }, status: "HOT" },
    }),
    prisma.lead.count({
      where: { job: { userId: user.id }, status: "WARM" },
    }),
  ]);

  const usagePct = sub ? Math.round((sub.leadsUsed / sub.leadLimit) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
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
            <Link
              href="/painel/conta"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Gerenciar →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-500">
                Leads do mês
              </p>
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
              value={
                plan.consultantLimit === 999
                  ? "Ilimitados"
                  : `${plan.consultantLimit}`
              }
            />
            <Detail
              label="Renovação em"
              value={new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
              }).format(sub.currentPeriodEnd)}
            />
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Consultores ativos"
          value={consultantsCount}
          icon={<UsersIconSmall />}
          accent="brand"
        />
        <StatCard
          label="Trabalhos em execução"
          value={jobsCount}
          icon={<PlayIconSmall />}
          accent="brand"
        />
        <StatCard
          label="Leads mornos"
          value={warmLeadsCount}
          icon={<FlameSmallIcon />}
          accent="yellow"
        />
        <StatCard
          label="Leads quentes"
          value={hotLeadsCount}
          icon={<FlameSmallIcon />}
          accent="red"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          href="/painel/consultores/novo"
          title="Criar consultor"
          desc="Configure tom, objetivo e permissões"
          icon={<UsersIconSmall />}
        />
        <QuickAction
          href="/painel/listas/nova"
          title="Importar lista"
          desc="Upload CSV ou cole contatos manualmente"
          icon={<UploadIcon />}
        />
        <QuickAction
          href="/painel/trabalhos/novo"
          title="Iniciar trabalho"
          desc="Combine consultor + lista para prospectar"
          icon={<PlayIconSmall />}
        />
      </div>

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
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "brand" | "yellow" | "red";
}) {
  const accents = {
    brand: "bg-brand-50 text-brand-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy-600">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accents[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition-all hover:shadow-elevated hover:-translate-y-0.5"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-navy-900 group-hover:text-brand-700">{title}</p>
        <p className="mt-1 text-sm text-navy-600">{desc}</p>
      </div>
    </Link>
  );
}

// Mini icons
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
function FlameSmallIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s2 1 2 3a2 2 0 0 0 4 0c0-2-3-5-3-8z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
