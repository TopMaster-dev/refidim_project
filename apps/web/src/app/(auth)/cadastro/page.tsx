"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "../actions";

const BENEFITS = [
  "7 dias grátis · sem cartão",
  "WhatsApp + E-mail integrados",
  "IA configurada por consultor",
  "Cancele quando quiser",
];

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-5">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(96,165,250,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />

        <Logo variant="full" size="md" href="/" className="relative invert" />

        <div className="relative space-y-7 max-w-md">
          <h2 className="text-3xl font-semibold leading-snug tracking-tight">
            Comece a prospectar com IA em minutos
          </h2>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-slate-200">
                <CheckCircle />
                <span className="text-[15px]">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Refidim · refidim.com.br
        </p>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-white p-6 lg:col-span-3">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-10">
            <Logo variant="full" size="md" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Criar sua conta
            </h1>
            <p className="mt-2 text-slate-600">
              7 dias grátis para testar — sem cartão de crédito.
            </p>
          </div>

          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const r = await signUpAction(formData);
                if (r?.error) setError(r.error);
              });
            }}
            className="mt-10 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" name="name" required minLength={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                WhatsApp <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" placeholder="+55 11 99999-9999" autoComplete="tel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-slate-500">Mínimo 8 caracteres</p>
            </div>

            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Criando conta…" : "Criar conta grátis"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function CheckCircle() {
  return (
    <svg className="h-5 w-5 flex-shrink-0 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}
