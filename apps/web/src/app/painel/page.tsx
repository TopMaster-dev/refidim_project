import { getCurrentUser } from "@/lib/auth";
import { PLAN_CONFIGS } from "@refidim/shared";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const plan = user.subscription ? PLAN_CONFIGS[user.subscription.plan] : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user.name}</h1>
        <p className="text-gray-600">Bem-vindo ao painel Refidim.</p>
      </header>

      {plan && user.subscription && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Seu plano: {plan.label}</h2>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <Stat
              label="Leads do mês"
              value={`${user.subscription.leadsUsed} / ${plan.leadLimit}`}
            />
            <Stat label="Consultores permitidos" value={`${plan.consultantLimit}`} />
            <Stat label="Status" value={user.subscription.status} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Consultores ativos" value="0" />
        <Card title="Trabalhos em execução" value="0" />
        <Card title="Leads quentes" value="0" />
      </div>

      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        Próximo passo: criar seu primeiro consultor para começar a prospectar.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
