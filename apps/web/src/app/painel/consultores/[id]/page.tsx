import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { ConsultorDadosForm } from "./dados-form";

export default async function ConsultorDadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
  });
  if (!consultant) notFound();

  return <ConsultorDadosForm consultant={consultant} />;
}
