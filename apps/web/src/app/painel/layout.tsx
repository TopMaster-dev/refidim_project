import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "../(auth)/actions";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 text-xl font-bold text-brand-900">
          Refidim
        </div>
        <nav className="flex flex-col gap-1 p-3 text-sm">
          <NavLink href="/painel">Dashboard</NavLink>
          <NavLink href="/painel/consultores">Consultores</NavLink>
          <NavLink href="/painel/listas">Listas</NavLink>
          <NavLink href="/painel/trabalhos">Trabalhos</NavLink>
          <NavLink href="/painel/leads">Leads</NavLink>
          <NavLink href="/painel/extrator">Extrator</NavLink>
          <NavLink href="/painel/canais">Canais</NavLink>
          <NavLink href="/painel/conta">Conta</NavLink>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}
