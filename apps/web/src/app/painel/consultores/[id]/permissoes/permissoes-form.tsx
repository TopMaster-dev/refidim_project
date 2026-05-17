"use client";

import { useState, useTransition } from "react";
import type { ConsultantPermission } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePermissionsAction } from "../../actions";

const PERMISSIONS = [
  { name: "canMentionPrice", label: "Informar preço", caution: true, description: "Por padrão desligado — IA conduz para humano quando perguntarem preço" },
  { name: "canSendLink", label: "Enviar links" },
  { name: "canSendPresentation", label: "Enviar apresentação / proposta" },
  { name: "canSuggestMeeting", label: "Sugerir reunião" },
  { name: "canAnswerQuestions", label: "Responder dúvidas sobre o produto" },
  { name: "callHumanIfOutOfScope", label: "Chamar humano se sair do escopo" },
] as const;

interface Props {
  consultantId: string;
  initial: ConsultantPermission | null;
}

export function PermissoesForm({ consultantId, initial }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setOk(false);
        startTransition(async () => {
          const r = await savePermissionsAction(consultantId, formData);
          if (r?.error) setError(r.error);
          else setOk(true);
        });
      }}
      className="space-y-6"
    >
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <header>
          <h2 className="font-semibold text-gray-900">O que a IA pode fazer</h2>
          <p className="text-sm text-gray-600">
            Marque apenas o que esse consultor está autorizado a fazer nas conversas.
          </p>
        </header>

        <div className="space-y-3">
          {PERMISSIONS.map((p) => {
            const defaultChecked =
              (initial?.[p.name as keyof ConsultantPermission] as boolean | undefined) ??
              p.name !== "canMentionPrice";
            return (
              <label
                key={p.name}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name={p.name}
                  defaultChecked={defaultChecked}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{p.label}</span>
                  {"caution" in p && p.caution && (
                    <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      atenção
                    </span>
                  )}
                  {"description" in p && p.description && (
                    <p className="text-xs text-gray-500">{p.description}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <header>
          <h2 className="font-semibold text-gray-900">Links de conversão</h2>
          <p className="text-sm text-gray-600">
            URLs que a IA pode enviar quando o lead avançar
          </p>
        </header>

        <div className="space-y-2">
          <Label htmlFor="meetingLink">Link de agenda (Calendly etc)</Label>
          <Input
            id="meetingLink"
            name="meetingLink"
            type="url"
            defaultValue={initial?.meetingLink ?? ""}
            placeholder="https://calendly.com/sua-empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proposalUrl">URL da proposta (PDF ou página)</Label>
          <Input
            id="proposalUrl"
            name="proposalUrl"
            type="url"
            defaultValue={initial?.proposalUrl ?? ""}
            placeholder="https://drive.google.com/file/..."
          />
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Permissões salvas
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar permissões"}
      </Button>
    </form>
  );
}
