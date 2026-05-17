"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, JobStatus } from "@refidim/database";
import { jobSchema } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";
import { requirePaidSubscription } from "@/lib/subscription";

type Result = { error?: string; ok?: boolean; jobId?: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createJobAction(formData: FormData): Promise<Result> {
  const user = await requireUser();
  requirePaidSubscription(user.subscription);

  const parsed = jobSchema.safeParse({
    name: formData.get("name"),
    consultantId: formData.get("consultantId"),
    contactListId: formData.get("contactListId"),
    channel: formData.get("channel"),
    goal: formData.get("goal"),
    dailyLimit: Number(formData.get("dailyLimit") ?? 100),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Confirma ownership do consultor e lista
  const [consultant, list] = await Promise.all([
    prisma.consultant.findFirst({
      where: { id: parsed.data.consultantId, userId: user.id },
    }),
    prisma.contactList.findFirst({
      where: { id: parsed.data.contactListId, userId: user.id },
    }),
  ]);

  if (!consultant) return { error: "Consultor não encontrado" };
  if (!list) return { error: "Lista não encontrada" };

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  revalidatePath("/painel/trabalhos");
  redirect(`/painel/trabalhos/${job.id}`);
}

export async function startJobAction(jobId: string) {
  const user = await requireUser();
  requirePaidSubscription(user.subscription);
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: user.id },
    include: { contactList: { include: { _count: { select: { contacts: true } } } } },
  });
  if (!job) return;

  // Cria leads para todos os contatos da lista (que ainda não tenham lead nesse job)
  const contacts = await prisma.contact.findMany({
    where: { contactListId: job.contactListId, isOptedOut: false },
    select: { id: true },
  });

  await prisma.lead.createMany({
    data: contacts.map((c) => ({
      jobId: job.id,
      contactId: c.id,
    })),
    skipDuplicates: true,
  });

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.RUNNING,
      startedAt: job.startedAt ?? new Date(),
      pausedAt: null,
    },
  });

  revalidatePath(`/painel/trabalhos/${jobId}`);
  revalidatePath("/painel/trabalhos");
}

export async function pauseJobAction(jobId: string) {
  const user = await requireUser();
  await prisma.job.updateMany({
    where: { id: jobId, userId: user.id },
    data: { status: JobStatus.PAUSED, pausedAt: new Date() },
  });
  revalidatePath(`/painel/trabalhos/${jobId}`);
  revalidatePath("/painel/trabalhos");
}

export async function completeJobAction(jobId: string) {
  const user = await requireUser();
  await prisma.job.updateMany({
    where: { id: jobId, userId: user.id },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() },
  });
  revalidatePath(`/painel/trabalhos/${jobId}`);
  revalidatePath("/painel/trabalhos");
}

export async function deleteJobAction(jobId: string) {
  const user = await requireUser();
  await prisma.job.deleteMany({
    where: { id: jobId, userId: user.id },
  });
  revalidatePath("/painel/trabalhos");
  redirect("/painel/trabalhos");
}
