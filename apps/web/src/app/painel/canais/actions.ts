"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, WhatsAppStatus, Prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Marca a sessão como CONNECTING — o worker (polling) detecta e inicia o socket Baileys.
 */
export async function connectWhatsAppAction() {
  const user = await requireUser();

  await prisma.whatsAppSession.upsert({
    where: { userId: user.id },
    update: { status: WhatsAppStatus.CONNECTING, qrCode: null },
    create: { userId: user.id, status: WhatsAppStatus.CONNECTING },
  });

  revalidatePath("/painel/canais/whatsapp");
}

/**
 * Marca a sessão como DISCONNECTED — o worker detecta e encerra o socket.
 * Se logout=true, limpa também o authState (precisará escanear QR de novo).
 */
export async function disconnectWhatsAppAction(logout: boolean = false) {
  const user = await requireUser();

  await prisma.whatsAppSession.update({
    where: { userId: user.id },
    data: {
      status: WhatsAppStatus.DISCONNECTED,
      qrCode: null,
      // IMPORTANTE: Prisma trata `undefined` como "não atualize". Para limpar
      // o JSON nullable precisamos usar Prisma.DbNull explicitamente.
      ...(logout ? { authState: Prisma.DbNull, phoneNumber: null } : {}),
    },
  });

  revalidatePath("/painel/canais/whatsapp");
}

/**
 * Limpa o authState antigo e inicia uma nova sessão.
 * Use isso quando o usuário quer escanear com OUTRO número
 * (caso contrário, Baileys reconectaria ao número anterior).
 */
export async function switchWhatsAppNumberAction() {
  const user = await requireUser();

  await prisma.whatsAppSession.update({
    where: { userId: user.id },
    data: {
      status: WhatsAppStatus.CONNECTING,
      qrCode: null,
      // Limpa o JSON nullable explicitamente — `undefined` faria Prisma pular o campo.
      authState: Prisma.DbNull,
      phoneNumber: null,
      lastConnectedAt: null,
    },
  });

  revalidatePath("/painel/canais");
}
