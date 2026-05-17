"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createConsultantAction } from "../actions";

export default function NovoConsultorPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href="/painel/consultores"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Novo consultor</h1>
        <p className="text-gray-600">
          Cadastre os dados básicos. Você configurará contexto e permissões em seguida.
        </p>
      </header>

      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await createConsultantAction(formData);
            if (result?.error) setError(result.error);
          });
        }}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <Field label="Nome do consultor" name="name" placeholder="Ex: João Comercial" required />
        <Field label="Empresa" name="company" placeholder="Ex: Refidim" required />

        <div className="space-y-2">
          <Label htmlFor="product">Produto / serviço</Label>
          <textarea
            id="product"
            name="product"
            required
            minLength={10}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Descreva o que vende em até 3 linhas"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience">Público-alvo</Label>
          <textarea
            id="audience"
            name="audience"
            required
            minLength={10}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Quem é o cliente ideal"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tone">Tom de conversa</Label>
            <select
              id="tone"
              name="tone"
              required
              defaultValue="CONSULTIVE"
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
            <Label htmlFor="goal">Objetivo principal</Label>
            <select
              id="goal"
              name="goal"
              required
              defaultValue="CAPTURE_INTEREST"
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

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Criando..." : "Criar e continuar"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/painel/consultores">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} required={required} />
    </div>
  );
}
