"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createListFromCsvAction,
  createListFromPasteAction,
} from "../actions";

type Mode = "csv" | "paste";

export default function NovaListaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("csv");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/painel/listas"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nova lista</h1>
      </header>

      <div className="flex gap-1 rounded-md border border-gray-200 bg-gray-50 p-1">
        <ModeTab
          active={mode === "csv"}
          onClick={() => setMode("csv")}
          label="Upload CSV"
        />
        <ModeTab
          active={mode === "paste"}
          onClick={() => setMode("paste")}
          label="Colar contatos"
        />
      </div>

      {mode === "csv" ? (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const r = await createListFromCsvAction(formData);
              if (r?.error) setError(r.error);
              else if (r?.listId) router.push(`/painel/listas/${r.listId}`);
            });
          }}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome da lista</Label>
            <Input id="name" name="name" required minLength={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo CSV</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-gray-500">
              Cabeçalhos reconhecidos: <code>nome</code>, <code>empresa</code>,{" "}
              <code>telefone</code> (ou whatsapp/celular), <code>email</code>.
              Telefones são normalizados para E.164 (padrão BR).
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Importando..." : "Importar CSV"}
          </Button>
        </form>
      ) : (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const r = await createListFromPasteAction(formData);
              if (r?.error) setError(r.error);
              else if (r?.listId) router.push(`/painel/listas/${r.listId}`);
            });
          }}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome da lista</Label>
            <Input id="name" name="name" required minLength={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Cole os contatos (um por linha)</Label>
            <textarea
              id="text"
              name="text"
              required
              rows={10}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={`João, +55 11 99999-9999, joao@empresa.com\nMaria; 11988887777; maria@empresa.com\nPedro\t+5511977776666`}
            />
            <p className="text-xs text-gray-500">
              Separe campos por vírgula, ponto-e-vírgula ou tab. A detecção de
              telefone/e-mail é automática.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Importando..." : "Importar contatos"}
          </Button>
        </form>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      )}
    >
      {label}
    </button>
  );
}
