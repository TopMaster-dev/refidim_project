"use client";

import { useTransition } from "react";
import type { ExtractionJob } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { deleteExtractionAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "Na fila",
  RUNNING: "Extraindo",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
};

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-navy-100 text-navy-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function ExtractionsList({ jobs }: { jobs: ExtractionJob[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-navy-100 bg-white shadow-soft">
      <header className="border-b border-navy-100 px-6 py-4">
        <h2 className="font-semibold text-navy-900">Extrações recentes</h2>
      </header>

      {jobs.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-navy-500">
          Nenhuma extração ainda
        </p>
      ) : (
        <ul className="divide-y divide-navy-50">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-navy-900">
                    {j.segment} em {j.city}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[j.status]}`}>
                    {STATUS_LABELS[j.status]}
                    {j.status === "RUNNING" && j.extractedCount > 0 && ` (${j.extractedCount})`}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-navy-600">
                  Lista gerada: <strong>{j.resultListName}</strong> · meta {j.desiredQuantity}
                  {j.status === "COMPLETED" && ` · extraídos ${j.extractedCount}`}
                </p>
                {j.errorMessage && (
                  <p className="mt-1 text-xs text-red-700">{j.errorMessage}</p>
                )}
                <p className="mt-1 text-xs text-navy-400">{formatDate(j.createdAt)}</p>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Remover esta extração do histórico?")) {
                    startTransition(() => deleteExtractionAction(j.id));
                  }
                }}
                disabled={isPending}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
