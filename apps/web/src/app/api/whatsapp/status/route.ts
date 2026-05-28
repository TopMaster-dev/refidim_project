import { NextResponse } from "next/server";
import { prisma, WhatsAppStatus } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Quanto tempo até considerar CONNECTING como travado (worker offline).
// QR_PENDING NÃO entra no reset porque é o estado de "esperando usuário
// escanear" — pode legitimamente durar minutos. O bug anterior era resetar
// QR_PENDING depois de 60s e a UI cair em DISCONNECTED ainda durante a scan.
const STALE_CONNECTING_MS = 3 * 60_000; // 3 minutos

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Reset preventivo SÓ pra CONNECTING travado (worker offline).
  // QR_PENDING é deixado em paz — o worker é quem move pra CONNECTED quando
  // o usuário scaneia, ou pra DISCONNECTED se o QR expira.
  const cutoff = new Date(Date.now() - STALE_CONNECTING_MS);
  await prisma.whatsAppSession.updateMany({
    where: {
      userId: user.id,
      status: WhatsAppStatus.CONNECTING,
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
