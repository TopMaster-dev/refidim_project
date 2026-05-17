"use client";

import { useState, useTransition } from "react";
import type { BusinessContext } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBusinessContextAction } from "../../actions";

type Objection = { objection: string; idealAnswer: string };

interface Props {
  consultantId: string;
  initial: BusinessContext | null;
}

export function ContextoForm({ consultantId, initial }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initialObjections: Objection[] =
    (initial?.commonObjections as Objection[] | null | undefined) ?? [
      { objection: "", idealAnswer: "" },
    ];

  const [objections, setObjections] = useState<Objection[]>(initialObjections);

  return (
    <form
      action={(formData) => {
        setError(null);
        setOk(false);
        formData.set("commonObjections", JSON.stringify(objections.filter((o) => o.objection.trim())));
        startTransition(async () => {
          const r = await saveBusinessContextAction(consultantId, formData);
          if (r?.error) setError(r.error);
          else setOk(true);
        });
      }}
      className="space-y-6"
    >
      <Section title="Sobre o negócio">
        <TextField
          name="whatYouSell"
          label="O que vende"
          defaultValue={initial?.whatYouSell}
        />
        <TextField
          name="whoYouSellTo"
          label="Para quem vende"
          defaultValue={initial?.whoYouSellTo}
        />
        <TextField
          name="mainBenefit"
          label="Benefício principal"
          defaultValue={initial?.mainBenefit}
          rows={2}
        />
        <TextField
          name="differentials"
          label="Diferenciais"
          defaultValue={initial?.differentials}
        />
        <TextField
          name="conversationGoal"
          label="Objetivo da conversa"
          defaultValue={initial?.conversationGoal}
          rows={2}
        />
      </Section>

      <Section
        title="Objeções comuns"
        description="O que os leads costumam dizer e a resposta ideal que a IA deve dar"
      >
        <div className="space-y-3">
          {objections.map((obj, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 md:grid-cols-2"
            >
              <Input
                placeholder="Objeção do lead (ex: 'Quanto custa?')"
                value={obj.objection}
                onChange={(e) => {
                  const next = [...objections];
                  next[idx] = { ...next[idx], objection: e.target.value, idealAnswer: next[idx]?.idealAnswer ?? "" };
                  setObjections(next);
                }}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Resposta ideal"
                  value={obj.idealAnswer}
                  onChange={(e) => {
                    const next = [...objections];
                    next[idx] = { ...next[idx], objection: next[idx]?.objection ?? "", idealAnswer: e.target.value };
                    setObjections(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setObjections(objections.filter((_, i) => i !== idx))}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setObjections([...objections, { objection: "", idealAnswer: "" }])}
          >
            + Adicionar objeção
          </Button>
        </div>
      </Section>

      <Section
        title="Glossário"
        description="Palavras que a IA PODE ou NÃO PODE usar"
      >
        <div className="space-y-2">
          <Label htmlFor="glossaryAllowed">
            Pode usar (separadas por vírgula)
          </Label>
          <textarea
            id="glossaryAllowed"
            name="glossaryAllowed"
            defaultValue={initial?.glossaryAllowed?.join(", ") ?? ""}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="atendimento, oportunidades, contatos..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="glossaryBlocked">
            NÃO pode usar (separadas por vírgula)
          </Label>
          <textarea
            id="glossaryBlocked"
            name="glossaryBlocked"
            defaultValue={initial?.glossaryBlocked?.join(", ") ?? ""}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="robô, bot, automação em massa..."
          />
        </div>
      </Section>

      <Section
        title="Proibições"
        description="O que a IA NUNCA pode dizer (uma por linha)"
      >
        <textarea
          id="forbiddenActions"
          name="forbiddenActions"
          defaultValue={initial?.forbiddenActions?.join("\n") ?? ""}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
          placeholder={"Inventar informações\nFingir ser humano\nFalar mal de concorrentes"}
        />
      </Section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Contexto salvo
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar contexto"}
      </Button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <header>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        required
        minLength={10}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
