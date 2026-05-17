import Link from "next/link";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  CSV_UPLOAD: "Upload CSV",
  MANUAL_PASTE: "Colagem manual",
  GOOGLE_EXTRACTION: "Extração Google",
  PAID_TRAFFIC: "Tráfego pago",
};

const SOURCE_VARIANTS: Record<string, "brand" | "neutral"> = {
  CSV_UPLOAD: "brand",
  MANUAL_PASTE: "neutral",
  GOOGLE_EXTRACTION: "brand",
  PAID_TRAFFIC: "neutral",
};

export default async function ListasPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const lists = await prisma.contactList.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Listas de contatos"
        description={`${lists.length} ${lists.length === 1 ? "lista" : "listas"} no total`}
        actions={
          <Button asChild variant="primary">
            <Link href="/painel/listas/nova">+ Nova lista</Link>
          </Button>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={<ListIcon />}
          title="Nenhuma lista ainda"
          description="Faça upload de um CSV, cole contatos manualmente ou use o extrator do Google."
          action={
            <Button asChild variant="primary">
              <Link href="/painel/listas/nova">Criar primeira lista</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-25 text-left">
              <tr>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Nome</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Origem</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Contatos</th>
                <th className="px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-500">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lists.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link href={`/painel/listas/${l.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={SOURCE_VARIANTS[l.source]}>{SOURCE_LABELS[l.source]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 tabular">
                    {l._count.contacts.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="0.5" fill="currentColor" />
      <circle cx="3.5" cy="12" r="0.5" fill="currentColor" />
      <circle cx="3.5" cy="18" r="0.5" fill="currentColor" />
    </svg>
  );
}
