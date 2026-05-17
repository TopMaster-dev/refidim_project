import Link from "next/link";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Em execução",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
};

const STATUS_VARIANTS: Record<string, "neutral" | "success" | "warning" | "brand"> = {
  DRAFT: "neutral",
  RUNNING: "success",
  PAUSED: "warning",
  COMPLETED: "brand",
};

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
};

export default async function TrabalhosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      consultant: { select: { name: true } },
      contactList: { select: { name: true } },
      leads: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Trabalhos"
        description={`${jobs.length} ${jobs.length === 1 ? "campanha" : "campanhas"} no total`}
        actions={
          <Button asChild variant="primary">
            <Link href="/painel/trabalhos/novo">+ Novo trabalho</Link>
          </Button>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon />}
          title="Nenhum trabalho ainda"
          description="Combine um consultor com uma lista de contatos para iniciar uma campanha de prospecção."
          action={
            <Button asChild variant="primary">
              <Link href="/painel/trabalhos/novo">Criar primeiro trabalho</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {jobs.map((j) => {
            const cold = j.leads.filter((l) => l.status === "COLD").length;
            const warm = j.leads.filter((l) => l.status === "WARM").length;
            const hot = j.leads.filter((l) => l.status === "HOT").length;
            const handed = j.leads.filter((l) => l.status === "HANDED_OFF").length;

            return (
              <Link
                key={j.id}
                href={`/painel/trabalhos/${j.id}`}
                className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{j.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 truncate">
                      <span className="text-slate-700">{j.consultant.name}</span>
                      {" → "}
                      <span>{j.contactList.name}</span>
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[j.status]} dot>
                    {STATUS_LABELS[j.status]}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-2xs">
                  <Badge variant="outline" size="sm">{CHANNEL_LABELS[j.channel]}</Badge>
                  <Badge variant="outline" size="sm">{j.leads.length} leads</Badge>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3">
                  <Mini label="Frios" value={cold} />
                  <Mini label="Mornos" value={warm} accent="warning" />
                  <Mini label="Quentes" value={hot} accent="danger" />
                  <Mini label="Assumidos" value={handed} accent="brand" />
                </div>

                <p className="mt-3 text-2xs text-slate-400">Criado em {formatDate(j.createdAt)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warning" | "danger" | "brand";
}) {
  const colors = {
    default: "text-slate-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
    brand: "text-brand-700",
  };
  return (
    <div className="text-center">
      <p className={`text-base font-bold tabular ${colors[accent ?? "default"]}`}>{value}</p>
      <p className="text-2xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
