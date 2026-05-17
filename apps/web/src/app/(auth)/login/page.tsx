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
      <aside className="relative hidden overflow-hidden bg-brand-gradient text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />

        <Logo variant="full" size="md" href="/" className="relative invert" />

        <div className="relative space-y-6">
          <p className="text-3xl font-semibold leading-snug">
            "Pare de perder lead quente por falta de tempo."
          </p>
          <div className="flex items-center gap-3 text-sm text-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-200" />
            Acesse seu painel e veja seus leads
          </div>
        </div>

        <p className="relative text-xs text-brand-100/70">
          © {new Date().getFullYear()} Refidim
        </p>
      </aside>

      {/* Painel direito — form */}
      <main className="flex min-h-screen items-center justify-center bg-white p-6 lg:col-span-3">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden">
            <Logo variant="full" size="md" />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-3xl font-bold tracking-tight text-navy-900">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-navy-600">Acesse sua conta para continuar.</p>
          </div>

          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const r = await signInAction(formData);
                if (r?.error) setError(r.error);
              });
            }}
            className="mt-8 space-y-5"
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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
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
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-navy-600">
            Não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              Criar conta grátis
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
