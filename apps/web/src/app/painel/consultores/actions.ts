"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import {
  businessContextSchema,
  consultantSchema,
  permissionsSchema,
} from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";

type ActionResult = { error?: string; ok?: boolean };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createConsultantAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  // Limite de consultores do plano
  const count = await prisma.consultant.count({ where: { userId: user.id } });
  const limit = user.subscription?.consultantLimit ?? 1;
  if (count >= limit) {
    return {
      error: `Limite do plano atingido: ${limit} consultor(es). Faça upgrade para criar mais.`,
    };
  }

  const parsed = consultantSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    product: formData.get("product"),
    audience: formData.get("audience"),
    tone: formData.get("tone"),
    goal: formData.get("goal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const consultant = await prisma.consultant.create({
    data: {
      userId: user.id,
      ...parsed.data,
      permissions: { create: {} }, // defaults
    },
  });

  revalidatePath("/painel/consultores");
  redirect(`/painel/consultores/${consultant.id}/contexto`);
}

export async function updateConsultantAction(
  consultantId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const owned = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!owned) return { error: "Consultor não encontrado" };

  const parsed = consultantSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    product: formData.get("product"),
    audience: formData.get("audience"),
    tone: formData.get("tone"),
    goal: formData.get("goal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.consultant.update({
    where: { id: consultantId },
    data: parsed.data,
  });

  revalidatePath(`/painel/consultores/${consultantId}`);
  return { ok: true };
}

export async function deleteConsultantAction(consultantId: string) {
  const user = await requireUser();
  await prisma.consultant.deleteMany({
    where: { id: consultantId, userId: user.id },
  });
  revalidatePath("/painel/consultores");
  redirect("/painel/consultores");
}

export async function toggleConsultantActiveAction(consultantId: string) {
  const user = await requireUser();
  const c = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!c) return;
  await prisma.consultant.update({
    where: { id: consultantId },
    data: { isActive: !c.isActive },
  });
  revalidatePath("/painel/consultores");
}

// ---------- Contexto do negócio ----------

export async function saveBusinessContextAction(
  consultantId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const owned = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!owned) return { error: "Consultor não encontrado" };

  // Objeções vêm como JSON serializado do form
  let commonObjections: { objection: string; idealAnswer: string }[] = [];
  try {
    const raw = formData.get("commonObjections");
    if (typeof raw === "string" && raw.trim()) {
      commonObjections = JSON.parse(raw);
    }
  } catch {
    return { error: "Lista de objeções inválida" };
  }

  const parsed = businessContextSchema.safeParse({
    whatYouSell: formData.get("whatYouSell"),
    whoYouSellTo: formData.get("whoYouSellTo"),
    mainBenefit: formData.get("mainBenefit"),
    differentials: formData.get("differentials"),
    conversationGoal: formData.get("conversationGoal"),
    commonObjections,
    glossaryAllowed: splitCsv(formData.get("glossaryAllowed")),
    glossaryBlocked: splitCsv(formData.get("glossaryBlocked")),
    forbiddenActions: splitLines(formData.get("forbiddenActions")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.businessContext.upsert({
    where: { consultantId },
    update: parsed.data,
    create: { consultantId, ...parsed.data },
  });

  revalidatePath(`/painel/consultores/${consultantId}/contexto`);
  return { ok: true };
}

// ---------- Permissões ----------

export async function savePermissionsAction(
  consultantId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const owned = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!owned) return { error: "Consultor não encontrado" };

  const parsed = permissionsSchema.safeParse({
    canMentionPrice: formData.get("canMentionPrice") === "on",
    canSendLink: formData.get("canSendLink") === "on",
    canSendPresentation: formData.get("canSendPresentation") === "on",
    canSuggestMeeting: formData.get("canSuggestMeeting") === "on",
    canAnswerQuestions: formData.get("canAnswerQuestions") === "on",
    callHumanIfOutOfScope: formData.get("callHumanIfOutOfScope") === "on",
    meetingLink: formData.get("meetingLink") || "",
    proposalUrl: formData.get("proposalUrl") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.consultantPermission.upsert({
    where: { consultantId },
    update: {
      ...parsed.data,
      meetingLink: parsed.data.meetingLink || null,
      proposalUrl: parsed.data.proposalUrl || null,
    },
    create: {
      consultantId,
      ...parsed.data,
      meetingLink: parsed.data.meetingLink || null,
      proposalUrl: parsed.data.proposalUrl || null,
    },
  });

  revalidatePath(`/painel/consultores/${consultantId}/permissoes`);
  return { ok: true };
}

// ---------- Modelos de abertura ----------

export async function createOpeningAction(
  consultantId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!owned) return { error: "Consultor não encontrado" };

  const label = String(formData.get("label") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (label.length < 2 || text.length < 10) {
    return { error: "Rótulo e texto são obrigatórios" };
  }

  await prisma.openingTemplate.create({
    data: { consultantId, label, text },
  });

  revalidatePath(`/painel/consultores/${consultantId}/aberturas`);
  return { ok: true };
}

export async function deleteOpeningAction(openingId: string, consultantId: string) {
  const user = await requireUser();
  // confirma ownership via consultor
  await prisma.openingTemplate.deleteMany({
    where: {
      id: openingId,
      consultant: { userId: user.id },
    },
  });
  revalidatePath(`/painel/consultores/${consultantId}/aberturas`);
}

// ---------- Materiais ----------

export async function createMaterialAction(
  consultantId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const owned = await prisma.consultant.findFirst({
    where: { id: consultantId, userId: user.id },
  });
  if (!owned) return { error: "Consultor não encontrado" };

  const kind = String(formData.get("kind") ?? "LINK") as
    | "PDF" | "LINK" | "VIDEO" | "IMAGE" | "CATALOG";
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (label.length < 2 || url.length < 5) {
    return { error: "Rótulo e URL são obrigatórios" };
  }

  await prisma.consultantMaterial.create({
    data: { consultantId, kind, label, url, description },
  });

  revalidatePath(`/painel/consultores/${consultantId}/materiais`);
  return { ok: true };
}

export async function deleteMaterialAction(materialId: string, consultantId: string) {
  const user = await requireUser();
  await prisma.consultantMaterial.deleteMany({
    where: {
      id: materialId,
      consultant: { userId: user.id },
    },
  });
  revalidatePath(`/painel/consultores/${consultantId}/materiais`);
}

// ---------- helpers ----------

function splitCsv(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
