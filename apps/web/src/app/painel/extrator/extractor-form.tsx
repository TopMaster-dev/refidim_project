"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExtractionAction } from "./actions";

export function ExtractorForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setOk(false);
        startTransition(async () => {
          const r = await createExtractionAction(formData);
          if (r?.error) setError(r.error);
          else if (r?.ok) {
            setOk(true);
            const form = document.getElementById("extractor-form") as HTMLFormElement;
            form?.reset();
          }
        });
      }}
      id="extractor-form"
      className="space-y-4 rounded-2xl border border-navy-100 bg-white p-6 shadow-soft"
    >
      <h2 className="text-lg font-semibold text-navy-900">Nova extração</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="segment">Segmento</Label>
          <Input
            id="segment"
            name="segment"
            placeholder="Ex: clínicas odontológicas"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            placeholder="Ex: São Paulo, SP"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desiredQuantity">Quantidade desejada</Label>
          <Input
            id="desiredQuantity"
            name="desiredQuantity"
            type="number"
            min={1}
            max={5000}
            defaultValue={100}
            required
          />
          <p className="text-xs text-navy-500">Máx 5.000. O Google pode entregar menos.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resultListName">Nome da lista gerada</Label>
          <Input
            id="resultListName"
            name="resultListName"
            placeholder="Ex: Dentistas SP"
            required
            minLength={2}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Extração agendada. Pode levar de 5 a 30 minutos dependendo da quantidade.
        </div>
      )}

      <Button type="submit" variant="gradient" disabled={isPending}>
        {isPending ? "Agendando..." : "Iniciar extração"}
      </Button>
    </form>
  );
}
