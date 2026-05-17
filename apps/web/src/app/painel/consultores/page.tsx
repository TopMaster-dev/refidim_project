import Link from "next/link";
import { prisma } from "@refidim/database";
import { PLAN_CONFIGS } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultores</h1>
          <p className="text-gray-600">
            {count} de {limit === 999 ? "ilimitados" : limit} consultores no plano {plan?.label}
          </p>
        </div>
        <Button asChild disabled={atLimit}>
          <Link href={atLimit ? "#" : "/painel/consultores/novo"}>
            + Novo consultor
          </Link>
        </Button>
      </header>

      {atLimit && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Você atingiu o limite de consultores do seu plano. Faça upgrade para criar mais.
        </div>
      )}

      {consultants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Nenhum consultor ainda
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Crie seu primeiro consultor para começar a prospectar.
          </p>
          <Button asChild className="mt-6">
            <Link href="/painel/consultores/novo">Criar primeiro consultor</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Objetivo</th>
                <th className="px-4 py-3">Tom</th>
                <th className="px-4 py-3">Trabalhos</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultants.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/painel/consultores/${c.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.company}</td>
                  <td className="px-4 py-3">{GOAL_LABELS[c.goal]}</td>
                  <td className="px-4 py-3">{TONE_LABELS[c.tone]}</td>
                  <td className="px-4 py-3">{c._count.jobs}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.isActive
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                          : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      }
                    >
                      {c.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
