"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJobAction } from "../actions";

interface Consultant {
  id: string;
  name: string;
  company: string;
  goal: string;
}

interface ContactList {
  id: string;
  name: string;
  _count: { contacts: number };
}

export function NovoTrabalhoForm({
  consultants,
  lists,
}: {
  consultants: Consultant[];
  lists: ContactList[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedConsultant, setSelectedConsultant] = useState(consultants[0]?.id);

  const consultant = consultants.find((c) => c.id === selectedConsultant);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const r = await createJobAction(formData);
          if (r?.error) setError(r.error);
        });
      }}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome do trabalho</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder="Ex: PMEs SP — agendar reunião"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="consultantId">Consultor</Label>
        <select
          id="consultantId"
          name="consultantId"
          required
          value={selectedConsultant}
          onChange={(e) => setSelectedConsultant(e.target.value)}
          className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
        >
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.company})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactListId">Lista de contatos</Label>
        <select
          id="contactListId"
          name="contactListId"
          required
          className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l._count.contacts} contatos)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="channel">Canal</Label>
          <select
            id="channel"
            name="channel"
            required
            defaultValue="WHATSAPP"
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">E-mail</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo</Label>
          <select
            id="goal"
            name="goal"
            required
            defaultValue={consultant?.goal ?? "CAPTURE_INTEREST"}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="CAPTURE_INTEREST">Captar interesse</option>
            <option value="QUALIFY">Qualificar lead</option>
            <option value="SCHEDULE_MEETING">Agendar reunião</option>
            <option value="SEND_PROPOSAL">Enviar proposta</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dailyLimit">Limite diário de envios</Label>
        <Input
          id="dailyLimit"
          name="dailyLimit"
          type="number"
          min={1}
          max={1000}
          defaultValue={100}
          required
        />
        <p className="text-xs text-gray-500">
          Recomendado: 50-150 para WhatsApp aquecido, 30-50 para número novo.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar trabalho (em rascunho)"}
      </Button>
    </form>
  );
}
