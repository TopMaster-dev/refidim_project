import { NextResponse } from "next/server";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Retorna status atualizado das últimas 20 extrações do usuário logado.
 * Usado pelo polling da página /painel/extrator pra mostrar progresso em tempo real.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jobs = await prisma.extractionJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      extractedCount: true,
      desiredQuantity: true,
      errorMessage: true,
    },
  });

  return NextResponse.json({ jobs });
}
