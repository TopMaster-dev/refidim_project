import { NextResponse } from "next/server";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = await prisma.whatsAppSession.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      qrCode: true,
      phoneNumber: true,
      lastConnectedAt: true,
    },
  });

  return NextResponse.json(
    session ?? {
      status: "DISCONNECTED",
      qrCode: null,
      phoneNumber: null,
      lastConnectedAt: null,
    }
  );
}
