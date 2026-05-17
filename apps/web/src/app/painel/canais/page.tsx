import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { WhatsAppPanel } from "./whatsapp-panel";
import { EmailPanel } from "./email-panel";

export const dynamic = "force-dynamic";

export default async function CanaisPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [whatsapp, emailAccounts, consultants] = await Promise.all([
    prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        qrCode: true,
        phoneNumber: true,
        lastConnectedAt: true,
      },
    }),
    prisma.emailAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      // Omite senhas explicitamente
      select: {
        id: true,
        userId: true,
        consultantId: true,
        fromEmail: true,
        fromName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.consultant.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Canais</h1>
        <p className="mt-1 text-navy-600">
          Conecte WhatsApp e e-mail para que o Refidim possa abordar seus contatos.
        </p>
      </header>

      <WhatsAppPanel initial={whatsapp} />

      <EmailPanel accounts={emailAccounts} consultants={consultants} />
    </div>
  );
}
