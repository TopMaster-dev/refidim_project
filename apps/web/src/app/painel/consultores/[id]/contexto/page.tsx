import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { ContextoForm } from "./contexto-form";

export default async function ContextoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
    include: { context: true },
  });
  if (!consultant) notFound();

  return (
    <ContextoForm
      consultantId={consultant.id}
      initial={consultant.context}
    />
  );
}
