"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, WhatsAppStatus } from "@refidim/database";
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
      ...(logout ? { authState: undefined, phoneNumber: null } : {}),
    },
  });

  revalidatePath("/painel/canais/whatsapp");
}
