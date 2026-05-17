import Link from "next/link";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  CSV_UPLOAD: "Upload CSV",
  MANUAL_PASTE: "Colagem manual",
  GOOGLE_EXTRACTION: "Extração Google",
  PAID_TRAFFIC: "Tráfego pago",
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
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listas de contatos</h1>
          <p className="text-gray-600">
            {lists.length} {lists.length === 1 ? "lista" : "listas"}
          </p>
        </div>
        <Button asChild>
          <Link href="/painel/listas/nova">+ Nova lista</Link>
        </Button>
      </header>

      {lists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Nenhuma lista ainda
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça upload de um CSV, cole contatos ou use o extrator do Google.
          </p>
          <Button asChild className="mt-6">
            <Link href="/painel/listas/nova">Criar primeira lista</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Contatos</th>
                <th className="px-4 py-3">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lists.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/painel/listas/${l.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {SOURCE_LABELS[l.source]}
                  </td>
                  <td className="px-4 py-3 font-semibold">{l._count.contacts}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(l.createdAt)}
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
