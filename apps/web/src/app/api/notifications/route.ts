import { NextResponse } from "next/server";
import { prisma, MessageDirection, MessageSender } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Últimas respostas recebidas de leads (INBOUND do contato).
 * O cliente quer ser notificado quando um lead responde após a IA enviar.
 *
 * O badge "não lido" é calculado no client comparando `sentAt` com um
 * `lastSeenAt` guardado em localStorage — assim não precisamos de uma coluna
 * "lida" por mensagem.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const replies = await prisma.message.findMany({
    where: {
      direction: MessageDirection.INBOUND,
      sender: MessageSender.CONTACT,
      conversation: { lead: { job: { userId: user.id } } },
    },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: {
      id: true,
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

  const items = replies.map((m) => {
    const c = m.conversation.lead.contact;
    return {
      id: m.id,
      preview: (m.body ?? "").slice(0, 100),
      sentAt: m.sentAt.toISOString(),
      channel: m.conversation.channel,
      leadId: m.conversation.lead.id,
      leadStatus: m.conversation.lead.status,
      contactName: c.name ?? c.phone ?? c.email ?? "Contato",
    };
  });

  return NextResponse.json({ items });
}
