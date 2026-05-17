import Link from "next/link";
import { prisma, LeadStatus } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDate } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "neutral" | "warning" | "danger" | "brand"> = {
  COLD: "neutral",
  WARM: "warning",
  HOT: "danger",
  HANDED_OFF: "brand",
  OPTED_OUT: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
  HANDED_OFF: "Assumido",
  OPTED_OUT: "Opt-out",
};

interface PageProps {
  searchParams: Promise<{ status?: string; channel?: string; job?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;

  const where = {
    job: {
      userId: user.id,
      ...(sp.channel ? { channel: sp.channel as "WHATSAPP" | "EMAIL" } : {}),
    },
    ...(sp.status && Object.values(LeadStatus).includes(sp.status as LeadStatus)
      ? { status: sp.status as LeadStatus }
      : {}),
    ...(sp.job ? { jobId: sp.job } : {}),
  };

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        contact: true,
        job: { include: { consultant: true } },
      },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { job: { userId: user.id } },
      _count: true,
    }),
  ]);

  const totalByStatus: Record<string, number> = {};
  for (const c of counts) totalByStatus[c.status] = c._count;
  const total = Object.values(totalByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Leads"
        description="Acompanhe contatos em conversa e assuma quando estiver pronto."
      />

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-0">
        <FilterTab active={!sp.status} href="/painel/leads" count={total}>
          Todos
        </FilterTab>
        {(["HOT", "WARM", "COLD", "HANDED_OFF", "OPTED_OUT"] as const).map((s) => (
          <FilterTab
            key={s}
            active={sp.status === s}
            href={`/painel/leads?status=${s}`}
            count={totalByStatus[s] ?? 0}
          >
            {STATUS_LABELS[s]}
          </FilterTab>
        ))}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<TrendingIcon />}
          title="Nenhum lead nesta visualização"
          description="Inicie um trabalho na aba Trabalhos para começar a prospectar e ver leads aparecerem aqui."
          action={
            <Button asChild variant="primary">
              <Link href="/painel/trabalhos/novo">Criar trabalho</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-25 text-left">
              <tr>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Contato</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Trabalho</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Canal</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Última interação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link href={`/painel/leads/${l.id}`} className="flex items-center gap-3 font-medium text-slate-900 hover:text-brand-700">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {(l.contact.name ?? l.contact.phone ?? l.contact.email ?? "?").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 truncate">
                        {l.contact.name ?? l.contact.phone ?? l.contact.email ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{l.contact.company ?? "—"}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{l.job.name}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{l.job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANTS[l.status]} dot>{STATUS_LABELS[l.status]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-2xs text-slate-500">
                    {l.lastMessageAt ? formatDate(l.lastMessageAt) : "—"}
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

function FilterTab({
  active,
  href,
  count,
  children,
}: {
  active: boolean;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700"
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular",
          active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function TrendingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
