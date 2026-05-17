import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { ListaDetalhe } from "./lista-detalhe";

export default async function ListaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const list = await prisma.contactList.findFirst({
    where: { id, userId: user.id },
    include: {
      contacts: { orderBy: { createdAt: "asc" }, take: 500 },
      _count: { select: { contacts: true } },
    },
  });

  if (!list) notFound();

  const stats = {
    total: list._count.contacts,
    withPhone: list.contacts.filter((c) => c.phone).length,
    withEmail: list.contacts.filter((c) => c.email).length,
    optedOut: list.contacts.filter((c) => c.isOptedOut).length,
  };

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/painel/listas"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Listas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{list.name}</h1>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Com telefone" value={stats.withPhone} />
        <Stat label="Com e-mail" value={stats.withEmail} />
        <Stat label="Opt-out" value={stats.optedOut} />
      </div>

      <ListaDetalhe listId={list.id} contacts={list.contacts} totalCount={list._count.contacts} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
