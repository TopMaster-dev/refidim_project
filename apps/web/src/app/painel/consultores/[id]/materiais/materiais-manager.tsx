"use client";

import { useState, useTransition } from "react";
import type { ConsultantMaterial } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMaterialAction,
  deleteMaterialAction,
} from "../../actions";

const KIND_LABELS: Record<string, string> = {
  PDF: "PDF",
  LINK: "Link",
  VIDEO: "Vídeo",
  IMAGE: "Imagem",
  CATALOG: "Catálogo",
};

export function MateriaisManager({
  consultantId,
  materials,
}: {
  consultantId: string;
  materials: ConsultantMaterial[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const r = await createMaterialAction(consultantId, formData);
            if (r?.error) setError(r.error);
            else {
              const form = document.getElementById("material-form") as HTMLFormElement;
              form?.reset();
            }
          });
        }}
        id="material-form"
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <h2 className="font-semibold text-gray-900">Adicionar material</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="kind">Tipo</Label>
            <select
              id="kind"
              name="kind"
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
            >
              <option value="PDF">PDF</option>
              <option value="LINK">Link</option>
              <option value="VIDEO">Vídeo</option>
              <option value="IMAGE">Imagem</option>
              <option value="CATALOG">Catálogo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Rótulo (mostrado à IA)</Label>
            <Input
              id="label"
              name="label"
              placeholder="Ex: Apresentação institucional"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input id="url" name="url" type="url" required placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Quando usar (opcional)</Label>
          <Input
            id="description"
            name="description"
            placeholder="Ex: enviar quando lead pedir mais info técnica"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Adicionar material"}
        </Button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white">
        <header className="border-b border-gray-200 px-6 py-3">
          <h2 className="font-semibold text-gray-900">
            Materiais cadastrados ({materials.length})
          </h2>
        </header>

        {materials.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            Nenhum material ainda
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {materials.map((m) => (
              <li key={m.id} className="flex items-start justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">
                    <span className="mr-2 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase text-gray-600">
                      {KIND_LABELS[m.kind]}
                    </span>
                    {m.label}
                  </p>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    {m.url}
                  </a>
                  {m.description && (
                    <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir este material?")) {
                      startTransition(() => deleteMaterialAction(m.id, consultantId));
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
