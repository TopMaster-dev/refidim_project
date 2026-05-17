"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  handOffLeadAction,
  returnLeadToAIAction,
  sendHumanMessageAction,
} from "../actions";

interface LeadView {
  id: string;
  status: string;
  notes: string | null;
  contact: {
    name: string | null;
    phone: string | null;
    email: string | null;
    company: string | null;
  };
  job: { name: string; channel: string; consultantName: string };
  conversation: {
    id: string;
    isPaused: boolean;
    messages: Array<{
      id: string;
      direction: "OUTBOUND" | "INBOUND" | string;
      sender: "AI" | "HUMAN" | "CONTACT" | string;
      body: string;
      sentAt: string;
    }>;
  } | null;
  alerts: Array<{ id: string; message: string; createdAt: string; isRead: boolean }>;
}

const STATUS_LABELS: Record<string, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
  HANDED_OFF: "Assumido",
  OPTED_OUT: "Opt-out",
};

const STATUS_VARIANTS: Record<string, "neutral" | "warning" | "danger" | "brand"> = {
  COLD: "neutral",
  WARM: "warning",
  HOT: "danger",
  HANDED_OFF: "brand",
  OPTED_OUT: "neutral",
};

export function LeadDetailClient({ lead }: { lead: LeadView }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");

  const isHandedOff = lead.status === "HANDED_OFF";
  const isOptedOut = lead.status === "OPTED_OUT";

  const displayName = lead.contact.name ?? lead.contact.phone ?? lead.contact.email ?? "—";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/painel/leads" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          ← Leads
        </Link>

        <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-base font-bold text-white shadow-brand">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{displayName}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {lead.contact.company && <span>{lead.contact.company}</span>}
                {lead.contact.company && (lead.contact.phone || lead.contact.email) && " · "}
                {lead.contact.phone && <span className="font-mono">{lead.contact.phone}</span>}
                {lead.contact.phone && lead.contact.email && " · "}
                {lead.contact.email && <span>{lead.contact.email}</span>}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {lead.job.consultantName} → {lead.job.name} · {lead.job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"}
              </p>
            </div>
          </div>

          <Badge variant={STATUS_VARIANTS[lead.status]} size="lg" dot>
            {STATUS_LABELS[lead.status]}
          </Badge>
        </header>
      </div>

      {/* Análise IA */}
      {lead.notes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Análise da IA</p>
          <p className="mt-1 text-sm text-slate-800">{lead.notes}</p>
        </div>
      )}

      {/* Alertas */}
      {lead.alerts.length > 0 && (
        <div className="space-y-2">
          {lead.alerts.map((a) => (
            <div
              key={a.id}
              className={
                a.isRead
                  ? "rounded-xl border border-slate-200 bg-slate-25 px-4 py-3 text-sm text-slate-600"
                  : "rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-900"
              }
            >
              <span className="font-semibold">🚨 Alerta:</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Handoff control */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="text-sm">
            {isOptedOut && (
              <p className="text-slate-700">
                <span className="font-semibold">Opt-out:</span> este contato optou por sair. Não envie novas mensagens.
              </p>
            )}
            {isHandedOff && (
              <p className="text-slate-700">
                <span className="font-semibold">Você assumiu:</span> a IA está pausada. Responda manualmente abaixo.
              </p>
            )}
            {!isHandedOff && !isOptedOut && (
              <p className="text-slate-700">
                <span className="font-semibold">IA ativa:</span> assuma quando quiser responder você mesmo.
              </p>
            )}
          </div>

          {!isOptedOut && (
            <div className="flex gap-2">
              {!isHandedOff ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await handOffLeadAction(lead.id);
                    })
                  }
                  disabled={isPending}
                >
                  Assumir conversa
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await returnLeadToAIAction(lead.id);
                    })
                  }
                  disabled={isPending}
                >
                  Devolver para IA
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Conversa */}
      <Card>
        <CardHeader>
          <CardTitle>Conversa</CardTitle>
        </CardHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {!lead.conversation || lead.conversation.messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Nenhuma mensagem ainda.</p>
          ) : (
            lead.conversation.messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        {isHandedOff && lead.conversation && (
          <form
            action={async (formData) => {
              setError(null);
              formData.set("leadId", lead.id);
              formData.set("text", text);
              startTransition(async () => {
                const r = await sendHumanMessageAction(formData);
                if (r?.error) setError(r.error);
                else setText("");
              });
            }}
            className="border-t border-slate-100 p-4"
          >
            <div className="rounded-lg border border-slate-200 bg-white shadow-xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Sua resposta…"
                className="w-full rounded-lg border-0 bg-transparent px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                <p className="text-2xs text-slate-500">
                  Aparecerá no canal {lead.job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"} do contato.
                </p>
                <Button type="submit" variant="primary" size="sm" disabled={isPending || !text.trim()}>
                  Enviar
                </Button>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-danger-700">{error}</p>}
          </form>
        )}
      </Card>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: { direction: string; sender: string; body: string; sentAt: string };
}) {
  const isOutbound = message.direction === "OUTBOUND";
  const isHuman = message.sender === "HUMAN";
  const isAI = message.sender === "AI";

  return (
    <div className={isOutbound ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[78%]">
        <div
          className={
            isOutbound
              ? isHuman
                ? "rounded-2xl rounded-br-md bg-slate-900 px-4 py-2.5 text-sm text-white"
                : "rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white"
              : "rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800"
          }
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
        </div>
        <p
          className={
            isOutbound
              ? "mt-1 text-right text-2xs text-slate-400"
              : "mt-1 text-2xs text-slate-400"
          }
        >
          {isAI && "🤖 IA · "}
          {isHuman && "👤 Você · "}
          {new Date(message.sentAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
