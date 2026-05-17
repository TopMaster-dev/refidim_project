import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { MateriaisManager } from "./materiais-manager";

export default async function MateriaisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const consultant = await prisma.consultant.findFirst({
    where: { id, userId: user.id },
    include: {
      materials: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!consultant) notFound();

  return (
    <MateriaisManager
      consultantId={consultant.id}
      materials={consultant.materials}
    />
  );
}
