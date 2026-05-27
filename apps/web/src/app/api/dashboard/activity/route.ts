import { NextResponse } from "next/server";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Últimas 15 mensagens do usuário logado — enviadas E recebidas — pra um
 * feed "ao vivo" no dashboard. Inclui dados básicos do contato e status do lead.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const messages = await prisma.message.findMany({
    where: {
      conversation: { lead: { job: { userId: user.id } } },
    },
    orderBy: { sentAt: "desc" },
    take: 15,
    select: {
      id: true,
      direction: true,
      sender: true,
      body: true,
      sentAt: true,
      conversation: {
        select: {
          channel: true,
          lead: {
            select: {
              id: true,
              status: true,
              contact: { select: { name: true, phone: true, email: true } },
            },
          },
        },
      },
    },
  });

  // Achata pra forma mais leve no JSON
  const items = messages.map((m) => {
    const contact = m.conversation.lead.contact;
    return {
      id: m.id,
      direction: m.direction,
      sender: m.sender,
      // Trunca preview pra UI ficar leve
      preview: (m.body ?? "").slice(0, 120),
      sentAt: m.sentAt.toISOString(),
      channel: m.conversation.channel,
      leadId: m.conversation.lead.id,
      leadStatus: m.conversation.lead.status,
      contactName: contact.name ?? contact.phone ?? contact.email ?? "—",
    };
  });

  return NextResponse.json({ items });
}
