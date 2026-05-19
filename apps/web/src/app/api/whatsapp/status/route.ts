import { NextResponse } from "next/server";
import { prisma, WhatsAppStatus } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Quanto tempo até considerar CONNECTING/QR_PENDING como travado (worker offline)
const STALE_MS = 60_000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Reset preventivo: se polling detectar sessão CONNECTING/QR_PENDING sem
  // movimento há mais de 60s, considera worker offline e libera o estado.
  const cutoff = new Date(Date.now() - STALE_MS);
  await prisma.whatsAppSession.updateMany({
    where: {
      userId: user.id,
      status: { in: [WhatsAppStatus.CONNECTING, WhatsAppStatus.QR_PENDING] },
      updatedAt: { lt: cutoff },
    },
    data: { status: WhatsAppStatus.DISCONNECTED, qrCode: null },
  });

  const session = await prisma.whatsAppSession.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      qrCode: true,
      phoneNumber: true,
      lastConnectedAt: true,
      updatedAt: true,
      authState: true,
    },
  });

  if (!session) {
    return NextResponse.json({
      status: "DISCONNECTED",
      qrCode: null,
      phoneNumber: null,
      lastConnectedAt: null,
      hasStoredAuth: false,
    });
  }

  return NextResponse.json({
    status: session.status,
    qrCode: session.qrCode,
    phoneNumber: session.phoneNumber,
    lastConnectedAt: session.lastConnectedAt,
    hasStoredAuth: !!session.authState,
  });
}
