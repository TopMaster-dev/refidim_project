"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  RUNNING: "bg-blue-100 text-blue-700 animate-pulse",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

type LiveStatus = {
  id: string;
  status: string;
  extractedCount: number;
  desiredQuantity: number;
  errorMessage: string | null;
};

export function ExtractionsList({ jobs }: { jobs: ExtractionJob[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Polling: mantém um overlay de status vivo enquanto algum job está QUEUED/RUNNING.
  // Quando todos terminam, paramos o polling e damos refresh pra ver os dados novos
  // (lista de contatos gerada, etc).
  const [live, setLive] = useState<Record<string, LiveStatus>>({});
  const hasActive = jobs.some(
    (j) => j.status === "QUEUED" || j.status === "RUNNING" ||
           live[j.id]?.status === "QUEUED" || live[j.id]?.status === "RUNNING"
  );

  useEffect(() => {
    if (!hasActive) return;
    let cancelled = false;
    let prevActive = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/extractor/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: LiveStatus[] };
        if (cancelled) return;
        const map: Record<string, LiveStatus> = {};
        for (const j of data.jobs) map[j.id] = j;
        setLive(map);

        const stillActive = data.jobs.some(
          (j) => j.status === "QUEUED" || j.status === "RUNNING"
        );
        // Acabou agora? Refresh do servidor pra mostrar a nova lista gerada
        if (prevActive && !stillActive) router.refresh();
        prevActive = stillActive;
      } catch {
        // ignora — tenta de novo no próximo tick
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasActive, router]);

  function merged(j: ExtractionJob): {
    status: string;
    extractedCount: number;
    errorMessage: string | null;
  } {
    const overlay = live[j.id];
    if (overlay) {
      return {
        status: overlay.status,
        extractedCount: overlay.extractedCount,
        errorMessage: overlay.errorMessage,
      };
    }
    return { status: j.status, extractedCount: j.extractedCount, errorMessage: j.errorMessage };
  }

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
          {jobs.map((j) => {
            const m = merged(j);
            const isRunning = m.status === "RUNNING";
            const isQueued = m.status === "QUEUED";
            const progressPct = Math.min(
              100,
              Math.round((m.extractedCount / Math.max(1, j.desiredQuantity)) * 100)
            );
            return (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-navy-900">
                      {j.segment} em {j.city}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}>
                      {STATUS_LABELS[m.status]}
                      {isRunning && m.extractedCount > 0 && ` (${m.extractedCount}/${j.desiredQuantity})`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-navy-600">
                    Lista gerada: <strong>{j.resultListName}</strong> · meta {j.desiredQuantity}
                    {m.status === "COMPLETED" && ` · extraídos ${m.extractedCount}`}
                  </p>
                  {(isRunning || isQueued) && (
                    <div className="mt-2 h-1.5 w-full max-w-md rounded-full bg-navy-100 overflow-hidden">
                      <div
                        className={isRunning ? "h-full bg-blue-500 transition-all" : "h-full bg-navy-300"}
                        style={{ width: isRunning ? `${progressPct}%` : "8%" }}
                      />
                    </div>
                  )}
                  {m.errorMessage && (
                    <p className="mt-1 text-xs text-red-700">{m.errorMessage}</p>
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
