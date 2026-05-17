import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { LeadDetailClient } from "./detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const lead = await prisma.lead.findFirst({
    where: { id, job: { userId: user.id } },
    include: {
      contact: true,
      job: { include: { consultant: true } },
      conversation: {
        include: {
          messages: { orderBy: { sentAt: "asc" } },
        },
      },
      alerts: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={{
        id: lead.id,
        status: lead.status,
        notes: lead.notes,
        contact: {
          name: lead.contact.name,
          phone: lead.contact.phone,
          email: lead.contact.email,
          company: lead.contact.company,
        },
        job: {
          name: lead.job.name,
          channel: lead.job.channel,
          consultantName: lead.job.consultant.name,
        },
        conversation: lead.conversation
          ? {
              id: lead.conversation.id,
              isPaused: lead.conversation.isPaused,
              messages: lead.conversation.messages.map((m) => ({
                id: m.id,
                direction: m.direction,
                sender: m.sender,
                body: m.body,
                sentAt: m.sentAt.toISOString(),
              })),
            }
          : null,
        alerts: lead.alerts.map((a) => ({
          id: a.id,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
          isRead: a.isRead,
        })),
      }}
    />
  );
}
