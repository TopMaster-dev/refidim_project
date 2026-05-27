import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PainelShell } from "./painel-shell";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Se cookie existe mas user sumiu (DB resetado, etc.), vai pelo /api/auth/clear
  // pra apagar o cookie e evitar loop com o middleware.
  if (!user) redirect("/api/auth/clear");

  const unreadAlerts = await prisma.alert.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <PainelShell
      userName={user.name}
      userEmail={user.email}
      unreadAlerts={unreadAlerts}
    >
      {children}
    </PainelShell>
  );
}
