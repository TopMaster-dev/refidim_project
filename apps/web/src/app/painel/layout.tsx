import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PainelSidebar } from "./sidebar";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-navy-50/40">
      <PainelSidebar userName={user.name} userEmail={user.email} />
      <main className="ml-64 min-h-screen">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
