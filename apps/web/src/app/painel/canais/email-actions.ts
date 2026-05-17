"use server";

import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { emailAccountSchema, encryptSecret } from "@refidim/shared";
import { getCurrentUser } from "@/lib/auth";

type Result = { error?: string; ok?: boolean; accountId?: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Cria uma EmailAccount após validar credenciais SMTP com nodemailer.verify().
 * IMAP é opcional — se passado, validamos formato mas não testamos.
 */
export async function createEmailAccountAction(formData: FormData): Promise<Result> {
  const user = await requireUser();

  const parsed = emailAccountSchema.safeParse({
    fromEmail: formData.get("fromEmail"),
    fromName: formData.get("fromName"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpUser: formData.get("smtpUser"),
    smtpPass: formData.get("smtpPass"),
    imapHost: formData.get("imapHost") || undefined,
    imapPort: formData.get("imapPort") || undefined,
    imapUser: formData.get("imapUser") || undefined,
    imapPass: formData.get("imapPass") || undefined,
    consultantId: formData.get("consultantId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const data = parsed.data;

  // Verifica SMTP — se falhar, NÃO grava nada
  try {
    const transporter = nodemailer.createTransport({
      host: data.smtpHost,
      port: data.smtpPort,
      secure: data.smtpPort === 465,
      auth: { user: data.smtpUser, pass: data.smtpPass },
      connectionTimeout: 10_000,
    });
    await transporter.verify();
  } catch (err) {
    return {
      error: `Falha no SMTP: ${(err as Error).message}. Confira host, porta, usuário e senha (app password se for Gmail).`,
    };
  }

  // Confirma ownership do consultor (se enviado)
  if (data.consultantId) {
    const c = await prisma.consultant.findFirst({
      where: { id: data.consultantId, userId: user.id },
    });
    if (!c) return { error: "Consultor não encontrado" };
  }

  const account = await prisma.emailAccount.create({
    data: {
      userId: user.id,
      consultantId: data.consultantId ?? null,
      fromEmail: data.fromEmail.toLowerCase(),
      fromName: data.fromName,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      smtpPassEnc: encryptSecret(data.smtpPass),
      imapHost: data.imapHost ?? null,
      imapPort: data.imapPort ?? null,
      imapUser: data.imapUser ?? null,
      imapPassEnc: data.imapPass ? encryptSecret(data.imapPass) : null,
    },
  });

  revalidatePath("/painel/canais");
  return { ok: true, accountId: account.id };
}

export async function deleteEmailAccountAction(accountId: string) {
  const user = await requireUser();
  await prisma.emailAccount.deleteMany({
    where: { id: accountId, userId: user.id },
  });
  revalidatePath("/painel/canais");
}

export async function toggleEmailAccountActiveAction(accountId: string) {
  const user = await requireUser();
  const acc = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: user.id },
  });
  if (!acc) return;
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { isActive: !acc.isActive },
  });
  revalidatePath("/painel/canais");
}
