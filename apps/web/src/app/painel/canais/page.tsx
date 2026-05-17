import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { WhatsAppPanel } from "./whatsapp-panel";

export const dynamic = "force-dynamic";

export default async function CanaisPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const whatsapp = await prisma.whatsAppSession.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      qrCode: true,
      phoneNumber: true,
      lastConnectedAt: true,
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Canais</h1>
        <p className="mt-1 text-navy-600">
          Conecte WhatsApp e e-mail para que o Refidim possa abordar seus contatos.
        </p>
      </header>

      <WhatsAppPanel initial={whatsapp} />

      {/* E-mail placeholder até Fase 5 */}
      <section className="rounded-2xl border border-dashed border-navy-200 bg-white p-8">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-500">
            <MailIcon />
          </div>
          <div>
            <h2 className="font-semibold text-navy-900">E-mail</h2>
            <p className="text-sm text-navy-600">SMTP + IMAP — em breve (Fase 5)</p>
          </div>
        </header>
      </section>
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
