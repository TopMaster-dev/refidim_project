"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="block text-center text-2xl font-bold text-brand-900">
          Refidim
        </Link>
        <h1 className="mt-6 text-center text-xl font-semibold text-gray-900">
          Entrar na sua conta
        </h1>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await signInAction(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="mt-8 space-y-4"
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
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-brand-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
