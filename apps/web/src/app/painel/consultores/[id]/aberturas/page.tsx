import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { AberturasManager } from "./aberturas-manager";

export default async function AberturasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
    include: { openings: { orderBy: { createdAt: "asc" } } },
  });
  if (!consultant) notFound();

  return (
    <AberturasManager consultantId={consultant.id} openings={consultant.openings} />
  );
}
