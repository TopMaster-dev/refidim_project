"use server";

import { redirect } from "next/navigation";
import { prisma, PlanTier, SubscriptionStatus } from "@refidim/database";
import { signInSchema, signUpSchema, PLAN_CONFIGS } from "@refidim/shared";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

type ActionResult = { error?: string };

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { name, email, password, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail" };
  }

  const passwordHash = await hashPassword(password);

  // Cria usuário em trial no plano Start
  const startPlan = PLAN_CONFIGS.START;
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash,
      phone,
      subscription: {
        create: {
          plan: PlanTier.START,
          status: SubscriptionStatus.TRIAL,
          leadLimit: startPlan.leadLimit,
          consultantLimit: startPlan.consultantLimit,
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias trial
        },
      },
    },
  });

  await createSession(user.id, user.email);
  redirect("/painel");
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "E-mail ou senha inválidos" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha inválidos" };
  }

  await createSession(user.id, user.email);
  redirect("/painel");
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
