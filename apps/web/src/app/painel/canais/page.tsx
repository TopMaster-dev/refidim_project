import { prisma, WhatsAppStatus } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { WhatsAppPanel } from "./whatsapp-panel";
import { EmailPanel } from "./email-panel";

export const dynamic = "force-dynamic";

// Quanto tempo até considerar uma sessão CONNECTING/QR_PENDING como "travada"
const STALE_CONNECTING_MS = 60_000;

export default async function CanaisPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Reset preventivo: se o worker estava offline, sessões podem ficar presas
  // em CONNECTING ou QR_PENDING. Se updatedAt > 60s no passado, resetamos
  // para DISCONNECTED para que o usuário possa clicar "Conectar" novamente.
  await prisma.whatsAppSession.updateMany({
    where: {
      userId: user.id,
      status: { in: [WhatsAppStatus.CONNECTING, WhatsAppStatus.QR_PENDING] },
      updatedAt: { lt: new Date(Date.now() - STALE_CONNECTING_MS) },
    },
    data: { status: WhatsAppStatus.DISCONNECTED, qrCode: null },
  });

  const [whatsapp, emailAccounts, consultants] = await Promise.all([
    prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        qrCode: true,
        phoneNumber: true,
        lastConnectedAt: true,
        updatedAt: true,
        authState: true,
      },
    }),
    prisma.emailAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
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
      <PageHeader
        title="Canais"
        description="Conecte WhatsApp e e-mail para o Refidim abordar seus contatos."
      />

      <WhatsAppPanel
        initial={
          whatsapp
            ? {
                status: whatsapp.status,
                qrCode: whatsapp.qrCode,
                phoneNumber: whatsapp.phoneNumber,
                lastConnectedAt: whatsapp.lastConnectedAt,
                hasStoredAuth: !!whatsapp.authState,
              }
            : null
        }
      />
      <EmailPanel accounts={emailAccounts} consultants={consultants} />
    </div>
  );
}
