"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dados", segment: "" },
  { label: "Contexto do negócio", segment: "contexto" },
  { label: "Permissões", segment: "permissoes" },
  { label: "Materiais", segment: "materiais" },
  { label: "Aberturas", segment: "aberturas" },
];

export function ConsultantTabs({ consultantId }: { consultantId: string }) {
  const pathname = usePathname();
  const base = `/painel/consultores/${consultantId}`;

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const isActive =
          tab.segment === ""
            ? pathname === base
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
