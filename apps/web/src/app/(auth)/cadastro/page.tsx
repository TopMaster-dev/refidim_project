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
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />

        <Logo variant="full" size="md" href="/" className="relative invert" />

        <div className="relative space-y-6">
          <h2 className="text-3xl font-semibold leading-snug">
            Comece a prospectar com IA em minutos
          </h2>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-brand-50">
                <CheckCircle />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-100/70">
          © {new Date().getFullYear()} Refidim
        </p>
      </aside>

      {/* Form */}
      <main className="flex min-h-screen items-center justify-center bg-white p-6 lg:col-span-3">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden">
            <Logo variant="full" size="md" />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-3xl font-bold tracking-tight text-navy-900">
              Crie sua conta
            </h1>
            <p className="mt-2 text-navy-600">
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
            className="mt-8 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" name="name" required minLength={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (opcional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+55 11 99999-9999"
                autoComplete="tel"
              />
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
              <p className="text-xs text-navy-500">Mínimo 8 caracteres</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Criando conta..." : "Criar conta grátis"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-navy-600">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
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
    <svg className="h-5 w-5 flex-shrink-0 text-brand-200" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
