"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createConsultantAction } from "../actions";

export default function NovoConsultorPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link href="/painel/consultores" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          ← Voltar
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Novo consultor</h1>
        <p className="mt-1.5 text-slate-500">
          Cadastre os dados básicos. Você configurará contexto, permissões e materiais em seguida.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do consultor</CardTitle>
          <CardDescription>O consultor é a "persona" que vai conversar com seus leads.</CardDescription>
        </CardHeader>
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await createConsultantAction(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="space-y-5 px-6 py-5"
        >
          <Field name="name" label="Nome do consultor" placeholder="Ex: João Comercial" required />
          <Field name="company" label="Empresa" placeholder="Ex: Refidim" required />

          <div className="space-y-2">
            <Label htmlFor="product">Produto / serviço</Label>
            <Textarea id="product" name="product" required minLength={10} rows={3} placeholder="Descreva o que vende em até 3 linhas" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Público-alvo</Label>
            <Textarea id="audience" name="audience" required minLength={10} rows={3} placeholder="Quem é o cliente ideal" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tom de conversa</Label>
              <Select id="tone" name="tone" required defaultValue="CONSULTIVE">
                <option value="CASUAL">Casual</option>
                <option value="CONSULTIVE">Consultivo</option>
                <option value="DIRECT">Direto</option>
                <option value="CURIOUS">Curiosidade</option>
                <option value="COMMERCIAL">Comercial</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Objetivo principal</Label>
              <Select id="goal" name="goal" required defaultValue="CAPTURE_INTEREST">
                <option value="CAPTURE_INTEREST">Captar interesse</option>
                <option value="QUALIFY">Qualificar lead</option>
                <option value="SCHEDULE_MEETING">Agendar reunião</option>
                <option value="SEND_PROPOSAL">Enviar proposta</option>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Criando…" : "Criar e continuar"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/painel/consultores">Cancelar</Link>
            </Button>
          </div>
        </form>
      </Card>
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
