import Link from "next/link";
import { prisma, LeadStatus } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  COLD: "bg-navy-100 text-navy-700",
  WARM: "bg-yellow-100 text-yellow-800",
  HOT: "bg-red-100 text-red-700",
  HANDED_OFF: "bg-blue-100 text-blue-700",
  OPTED_OUT: "bg-gray-200 text-gray-600",
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

  const [leads, jobs, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        contact: true,
        job: { include: { consultant: true } },
      },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { job: { userId: user.id } },
      _count: true,
    }),
  ]);

  const totalByStatus: Record<string, number> = {};
  for (const c of counts) totalByStatus[c.status] = c._count;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Leads</h1>
        <p className="mt-1 text-navy-600">
          Acompanhe contatos em conversa e assuma quando estiver pronto.
        </p>
      </header>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill active={!sp.status} href="/painel/leads">
          Todos ({Object.values(totalByStatus).reduce((a, b) => a + b, 0)})
        </FilterPill>
        {(["HOT", "WARM", "COLD", "HANDED_OFF", "OPTED_OUT"] as const).map((s) => (
          <FilterPill
            key={s}
            active={sp.status === s}
            href={`/painel/leads?status=${s}`}
          >
            {STATUS_LABELS[s]} ({totalByStatus[s] ?? 0})
          </FilterPill>
        ))}
      </div>

      {/* Filtros adicionais */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3 shadow-soft">
        <span className="text-sm font-medium text-navy-700">Filtros:</span>
        <select
          name="job"
          defaultValue={sp.job ?? ""}
          className="h-9 rounded-md border border-navy-200 px-2 text-sm"
          // eslint-disable-next-line react/no-unknown-property
        >
          <option value="">Todos os trabalhos</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-navy-900">Nenhum lead ainda</h2>
          <p className="mt-2 text-sm text-navy-600">
            Inicie um trabalho para começar a prospectar e os leads aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 bg-navy-50/40 text-left text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Trabalho</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Última interação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3 font-medium text-navy-900">
                    <Link
                      href={`/painel/leads/${l.id}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {l.contact.name ?? l.contact.phone ?? l.contact.email ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy-700">{l.contact.company ?? "—"}</td>
                  <td className="px-4 py-3 text-navy-600">{l.job.name}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {l.job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[l.status]}`}>
                      {STATUS_LABELS[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-navy-500">
                    {l.lastMessageAt ? formatDate(l.lastMessageAt) : "—"}
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

function FilterPill({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-gradient px-4 py-1.5 text-sm font-medium text-white shadow-brand"
          : "rounded-full border border-navy-200 bg-white px-4 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
      }
    >
      {children}
    </Link>
  );
}
