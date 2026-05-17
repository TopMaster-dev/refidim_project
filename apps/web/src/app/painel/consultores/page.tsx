import Link from "next/link";
import { prisma } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const GOAL_LABELS: Record<string, string> = {
  CAPTURE_INTEREST: "Captar interesse",
  QUALIFY: "Qualificar",
  SCHEDULE_MEETING: "Agendar reunião",
  SEND_PROPOSAL: "Enviar proposta",
};

const TONE_LABELS: Record<string, string> = {
  CASUAL: "Casual",
  CONSULTIVE: "Consultivo",
  DIRECT: "Direto",
  CURIOUS: "Curiosidade",
  COMMERCIAL: "Comercial",
};

export default async function ConsultoresPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [consultants, count] = await Promise.all([
    prisma.consultant.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { jobs: true } } },
    }),
    prisma.consultant.count({ where: { userId: user.id } }),
  ]);

  const plan = user.subscription ? PLAN_CONFIGS[user.subscription.plan] : null;
  const limit = user.subscription?.consultantLimit ?? 1;
  const atLimit = count >= limit;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Consultores"
        description={`${count} de ${limit === 999 ? "ilimitados" : limit} consultores no plano ${plan?.label}`}
        actions={
          <Button asChild variant="primary" disabled={atLimit}>
            <Link href={atLimit ? "#" : "/painel/consultores/novo"}>+ Novo consultor</Link>
          </Button>
        }
      />

      {atLimit && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Limite de consultores do plano atingido. Faça upgrade em <Link href="/painel/conta" className="font-semibold underline">Conta & plano</Link>.
        </div>
      )}

      {consultants.length === 0 ? (
        <EmptyState
          icon={<UserIcon />}
          title="Nenhum consultor ainda"
          description="Crie seu primeiro consultor para configurar o tom de conversa e começar a prospectar."
          action={
            <Button asChild variant="primary">
              <Link href="/painel/consultores/novo">Criar primeiro consultor</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-25 text-left">
              <tr>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Nome</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Objetivo</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Tom</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Trabalhos</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Criado em</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultants.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/painel/consultores/${c.id}`}
                      className="flex items-center gap-3 font-medium text-slate-900 hover:text-brand-700"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{c.company}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{GOAL_LABELS[c.goal]}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{TONE_LABELS[c.tone]}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 font-medium tabular">{c._count.jobs}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={c.isActive ? "success" : "neutral"} dot>
                      {c.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
