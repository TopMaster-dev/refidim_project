"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

type Result = { error?: string; ok?: boolean; jobId?: string };

export async function createExtractionAction(formData: FormData): Promise<Result> {
  const user = await requireUser();

  const segment = String(formData.get("segment") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const desiredQuantity = Number(formData.get("desiredQuantity") ?? 100);
  const resultListName = String(formData.get("resultListName") ?? "").trim();

  if (segment.length < 2) return { error: "Informe um segmento" };
  if (city.length < 2) return { error: "Informe a cidade" };
  if (desiredQuantity < 1 || desiredQuantity > 5000) return { error: "Quantidade entre 1 e 5000" };
  if (resultListName.length < 2) return { error: "Dê um nome para a lista que será criada" };

  const job = await prisma.extractionJob.create({
    data: {
      userId: user.id,
      segment,
      city,
      desiredQuantity,
      resultListName,
    },
  });

  revalidatePath("/painel/extrator");
  return { ok: true, jobId: job.id };
}

export async function deleteExtractionAction(jobId: string) {
  const user = await requireUser();
  await prisma.extractionJob.deleteMany({
    where: { id: jobId, userId: user.id },
  });
  revalidatePath("/painel/extrator");
}
