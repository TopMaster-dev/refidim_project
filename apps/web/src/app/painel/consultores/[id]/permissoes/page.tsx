import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PermissoesForm } from "./permissoes-form";

export default async function PermissoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
    include: { permissions: true },
  });
  if (!consultant) notFound();

  return (
    <PermissoesForm
      consultantId={consultant.id}
      initial={consultant.permissions}
    />
  );
}
