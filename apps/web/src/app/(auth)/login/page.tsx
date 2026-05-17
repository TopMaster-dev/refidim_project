"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-5">
      {/* Painel esquerdo — brand */}
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Gradient ornamentos */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(96,165,250,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />

        <Logo variant="full" size="md" href="/" className="relative invert" />

        <div className="relative space-y-7 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            <span className="text-slate-200">Bem-vindo de volta</span>
          </div>
          <p className="text-3xl font-semibold leading-snug tracking-tight">
            "Pare de perder lead quente por falta de tempo."
          </p>
          <p className="text-base text-slate-400">
            Acesse seu painel para ver leads quentes, alertas e conversas ativas.
          </p>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Refidim · refidim.com.br
        </p>
      </aside>

      {/* Painel direito — form */}
      <main className="flex min-h-screen items-center justify-center bg-white p-6 lg:col-span-3">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-10">
            <Logo variant="full" size="md" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Entrar na sua conta
            </h1>
            <p className="mt-2 text-slate-600">Acesse o painel para continuar.</p>
          </div>

          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const r = await signInAction(formData);
                if (r?.error) setError(r.error);
              });
            }}
            className="mt-10 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@empresa.com.br"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="#" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                  Esqueci a senha
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-brand-700 hover:text-brand-800">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
