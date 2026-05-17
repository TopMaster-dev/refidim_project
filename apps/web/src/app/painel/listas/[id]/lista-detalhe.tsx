"use client";

import { useTransition } from "react";
import type { Contact } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { deleteListAction, toggleContactOptOutAction } from "../actions";

export function ListaDetalhe({
  listId,
  contacts,
  totalCount,
}: {
  listId: string;
  contacts: Contact[];
  totalCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (
              confirm(
                "Excluir esta lista? Todos os contatos e leads vinculados serão removidos."
              )
            ) {
              startTransition(() => deleteListAction(listId));
            }
          }}
          disabled={isPending}
        >
          Excluir lista
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name ?? "—"}</td>
                <td className="px-4 py-3">{c.company ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {c.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{c.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      startTransition(() =>
                        toggleContactOptOutAction(c.id, listId)
                      )
                    }
                    className={
                      c.isOptedOut
                        ? "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 hover:bg-red-200"
                        : "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 hover:bg-green-200"
                    }
                  >
                    {c.isOptedOut ? "Opt-out" : "Ativo"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalCount > contacts.length && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
            Mostrando {contacts.length} de {totalCount} contatos.
          </div>
        )}
      </div>
    </div>
  );
}
