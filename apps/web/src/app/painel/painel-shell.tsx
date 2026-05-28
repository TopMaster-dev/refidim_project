"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { PainelSidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";

/**
 * Casca do painel: combina sidebar (drawer no mobile, fixa no desktop) +
 * topbar (hamburger no mobile + sino de notificações sempre).
 *
 * No desktop (lg+): sidebar fixa de 256px, conteúdo com margem.
 * No mobile: sidebar vira drawer deslizante, conteúdo ocupa tudo, topbar fixa.
 */
export function PainelShell({
  userName,
  userEmail,
  unreadAlerts,
  children,
}: {
  userName: string;
  userEmail: string;
  unreadAlerts: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Trava scroll do body quando drawer aberto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop (fixa) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block">
        <PainelSidebar userName={userName} userEmail={userEmail} unreadAlerts={unreadAlerts} />
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 animate-slide-in-left">
            <PainelSidebar
              userName={userName}
              userEmail={userEmail}
              unreadAlerts={unreadAlerts}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl lg:ml-64 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
          <div className="lg:hidden">
            <Logo variant="full" size="sm" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
