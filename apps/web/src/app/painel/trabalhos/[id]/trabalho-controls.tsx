"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  completeJobAction,
  deleteJobAction,
  pauseJobAction,
  startJobAction,
} from "../actions";

export function TrabalhoControls({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex-1 text-sm text-gray-600">
        {status === "DRAFT" && "Pronto para iniciar. Ao iniciar, os leads serão criados a partir da lista."}
        {status === "RUNNING" && "Em execução — o sistema está abordando contatos respeitando a janela de 7h-22h."}
        {status === "PAUSED" && "Pausado — nenhuma nova mensagem será enviada até retomar."}
        {status === "COMPLETED" && "Concluído — sem mais envios. Você ainda pode acessar os leads."}
      </div>

      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button
            onClick={() => startTransition(() => startJobAction(jobId))}
            disabled={isPending}
          >
            {isPending ? "Iniciando..." : "▶ Iniciar"}
          </Button>
        )}
        {status === "RUNNING" && (
          <>
            <Button
              variant="outline"
              onClick={() => startTransition(() => pauseJobAction(jobId))}
              disabled={isPending}
            >
              ⏸ Pausar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Marcar trabalho como concluído? Não poderá retomar.")) {
                  startTransition(() => completeJobAction(jobId));
                }
              }}
              disabled={isPending}
            >
              Concluir
            </Button>
          </>
        )}
        {status === "PAUSED" && (
          <Button
            onClick={() => startTransition(() => startJobAction(jobId))}
            disabled={isPending}
          >
            ▶ Retomar
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Excluir este trabalho? Todos os leads serão removidos.")) {
              startTransition(() => deleteJobAction(jobId));
            }
          }}
          disabled={isPending}
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}
