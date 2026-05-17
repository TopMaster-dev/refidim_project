"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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

const STATUS_STYLES: Record<string, string> = {
  COLD: "bg-navy-100 text-navy-700",
  WARM: "bg-yellow-100 text-yellow-800",
  HOT: "bg-red-100 text-red-700",
  HANDED_OFF: "bg-blue-100 text-blue-700",
  OPTED_OUT: "bg-gray-200 text-gray-600",
};

export function LeadDetailClient({ lead }: { lead: LeadView }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");

  const isHandedOff = lead.status === "HANDED_OFF";
  const isOptedOut = lead.status === "OPTED_OUT";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <Link href="/painel/leads" className="text-sm text-navy-500 hover:text-navy-700">
          ← Leads
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">
              {lead.contact.name ?? lead.contact.phone ?? lead.contact.email}
            </h1>
            <p className="mt-1 text-sm text-navy-600">
              {lead.contact.company && <span>{lead.contact.company} · </span>}
              {lead.contact.phone && <span>{lead.contact.phone} · </span>}
              {lead.contact.email && <span>{lead.contact.email}</span>}
            </p>
            <p className="mt-1 text-sm text-navy-500">
              {lead.job.consultantName} → {lead.job.name} ({lead.job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"})
            </p>
          </div>

          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[lead.status]}`}>
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
      </header>

      {/* Notas da IA */}
      {lead.notes && (
        <div className="rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-navy-500">Análise da IA</p>
          <p className="mt-1 text-navy-800">{lead.notes}</p>
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
                  ? "rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-sm text-navy-600"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              }
            >
              <span className="font-medium">🚨 Alerta:</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Controles de handoff */}
      <div className="flex items-center justify-between rounded-xl border border-navy-100 bg-white px-5 py-4 shadow-soft">
        <div className="text-sm text-navy-700">
          {isOptedOut && "Este contato optou por sair. Não envie novas mensagens."}
          {isHandedOff && "Você está conduzindo esta conversa. A IA está pausada."}
          {!isHandedOff && !isOptedOut && "A IA está conduzindo. Assuma quando quiser responder você mesmo."}
        </div>

        {!isOptedOut && (
          <div className="flex gap-2">
            {!isHandedOff ? (
              <Button
                variant="gradient"
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

      {/* Histórico de mensagens */}
      <section className="rounded-2xl border border-navy-100 bg-white shadow-soft">
        <header className="border-b border-navy-100 px-5 py-3">
          <h2 className="font-semibold text-navy-900">Conversa</h2>
        </header>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          {!lead.conversation || lead.conversation.messages.length === 0 ? (
            <p className="text-center text-sm text-navy-500">Nenhuma mensagem ainda.</p>
          ) : (
            lead.conversation.messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        {/* Caixa de envio quando humano assumiu */}
        {isHandedOff && lead.conversation && (
          <form
            action={(formData) => {
              setError(null);
              formData.set("leadId", lead.id);
              formData.set("text", text);
              startTransition(async () => {
                const r = await sendHumanMessageAction(formData);
                if (r?.error) setError(r.error);
                else setText("");
              });
            }}
            className="border-t border-navy-100 p-4"
          >
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Sua resposta…"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {error && (
                <p className="text-sm text-red-700">{error}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-500">
                  Atalho: <code>Ctrl+Enter</code> para enviar (em breve)
                </p>
                <Button type="submit" variant="gradient" size="sm" disabled={isPending || !text.trim()}>
                  Enviar resposta
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>
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
      <div className="max-w-[75%]">
        <div
          className={
            isOutbound
              ? isHuman
                ? "rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2 text-sm text-white shadow-brand"
                : "rounded-2xl rounded-br-md bg-brand-100 px-4 py-2 text-sm text-navy-900"
              : "rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-2 text-sm text-navy-800"
          }
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
        <p
          className={
            isOutbound
              ? "mt-1 text-right text-xs text-navy-400"
              : "mt-1 text-xs text-navy-400"
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
