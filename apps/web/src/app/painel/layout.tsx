import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PainelSidebar } from "./sidebar";

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
    <div className="min-h-screen bg-slate-50">
      <PainelSidebar
        userName={user.name}
        userEmail={user.email}
        unreadAlerts={unreadAlerts}
      />
      <main className="ml-64 min-h-screen">
        <div className="mx-auto max-w-7xl px-8 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
