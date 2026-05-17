"use client";

import { useState, useTransition } from "react";
import type { OpeningTemplate } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOpeningAction, deleteOpeningAction } from "../../actions";

export function AberturasManager({
  consultantId,
  openings,
}: {
  consultantId: string;
  openings: OpeningTemplate[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Por que múltiplas aberturas:</strong> a IA alterna entre as variações
        cadastradas para evitar padrão repetitivo (que o WhatsApp detecta como spam).
        Cadastre 3 a 5 variações com tons diferentes.
      </div>

      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const r = await createOpeningAction(consultantId, formData);
            if (r?.error) setError(r.error);
            else {
              const form = document.getElementById("opening-form") as HTMLFormElement;
              form?.reset();
            }
          });
        }}
        id="opening-form"
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <h2 className="font-semibold text-gray-900">Adicionar abertura</h2>

        <div className="space-y-2">
          <Label htmlFor="label">Rótulo (ex: leve, direta, consultiva)</Label>
          <Input id="label" name="label" required minLength={2} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text">Texto da abordagem</Label>
          <textarea
            id="text"
            name="text"
            required
            minLength={10}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Oi! Tudo bem? Posso te fazer uma pergunta rápida sobre..."
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Adicionar abertura"}
        </Button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white">
        <header className="border-b border-gray-200 px-6 py-3">
          <h2 className="font-semibold text-gray-900">
            Aberturas cadastradas ({openings.length})
          </h2>
        </header>

        {openings.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            Nenhuma abertura ainda. Adicione ao menos 3 variações.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {openings.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {o.label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                    {o.text}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir esta abertura?")) {
                      startTransition(() => deleteOpeningAction(o.id, consultantId));
                    }
                  }}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
