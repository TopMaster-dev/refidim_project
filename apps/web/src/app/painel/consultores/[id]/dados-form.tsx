"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Consultant } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteConsultantAction,
  toggleConsultantActiveAction,
  updateConsultantAction,
} from "../actions";

export function ConsultorDadosForm({ consultant }: { consultant: Consultant }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(formData) => {
          setError(null);
          setOk(false);
          startTransition(async () => {
            const r = await updateConsultantAction(consultant.id, formData);
            if (r?.error) setError(r.error);
            else setOk(true);
          });
        }}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field name="name" label="Nome" defaultValue={consultant.name} />
          <Field name="company" label="Empresa" defaultValue={consultant.company} />
        </div>

        <TextField
          name="product"
          label="Produto / serviço"
          defaultValue={consultant.product}
          rows={3}
        />

        <TextField
          name="audience"
          label="Público-alvo"
          defaultValue={consultant.audience}
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tom</Label>
            <select
              name="tone"
              defaultValue={consultant.tone}
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CASUAL">Casual</option>
              <option value="CONSULTIVE">Consultivo</option>
              <option value="DIRECT">Direto</option>
              <option value="CURIOUS">Curiosidade</option>
              <option value="COMMERCIAL">Comercial</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <select
              name="goal"
              defaultValue={consultant.goal}
              className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CAPTURE_INTEREST">Captar interesse</option>
              <option value="QUALIFY">Qualificar lead</option>
              <option value="SCHEDULE_MEETING">Agendar reunião</option>
              <option value="SEND_PROPOSAL">Enviar proposta</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Salvo com sucesso
          </p>
        )}

        <div className="flex justify-between">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                startTransition(async () => {
                  await toggleConsultantActiveAction(consultant.id);
                  router.refresh();
                })
              }
            >
              {consultant.isActive ? "Desativar" : "Ativar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Excluir este consultor? Esta ação não pode ser desfeita.")) {
                  startTransition(() => deleteConsultantAction(consultant.id));
                }
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required />
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required
        minLength={10}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
