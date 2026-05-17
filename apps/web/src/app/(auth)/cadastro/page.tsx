"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "../actions";

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-900">
          Refidim
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold text-gray-900">
          Criar sua conta
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          7 dias grátis para testar — sem cartão de crédito
        </p>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await signUpAction(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="mt-8 space-y-4"
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
            <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
