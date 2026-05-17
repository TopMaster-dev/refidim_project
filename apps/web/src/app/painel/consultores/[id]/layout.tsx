import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { ConsultantTabs } from "./tabs";

export default async function ConsultorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
  });
  if (!consultant) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/painel/consultores"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Consultores
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{consultant.name}</h1>
        <p className="text-gray-600">{consultant.company}</p>
      </header>

      <ConsultantTabs consultantId={id} />

      <div>{children}</div>
    </div>
  );
}
