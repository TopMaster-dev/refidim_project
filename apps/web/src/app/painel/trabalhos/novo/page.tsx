import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { NovoTrabalhoForm } from "./novo-form";

export default async function NovoTrabalhoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [consultants, lists] = await Promise.all([
    prisma.consultant.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, company: true, goal: true },
    }),
    prisma.contactList.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contacts: true } } },
    }),
  ]);

  if (consultants.length === 0) {
    return (
      <EmptyState
        title="Você precisa de pelo menos um consultor ativo"
        cta="Criar consultor"
        href="/painel/consultores/novo"
      />
    );
  }

  if (lists.length === 0) {
    return (
      <EmptyState
        title="Você precisa de pelo menos uma lista de contatos"
        cta="Criar lista"
        href="/painel/listas/nova"
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/painel/trabalhos"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Novo trabalho</h1>
        <p className="text-gray-600">
          Combine um consultor com uma lista para iniciar uma campanha.
        </p>
      </header>

      <NovoTrabalhoForm consultants={consultants} lists={lists} />
    </div>
  );
}

function EmptyState({
  title,
  cta,
  href,
}: {
  title: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
      <p className="text-gray-700">{title}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >
        {cta}
      </Link>
    </div>
  );
}
