"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Item = {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  sender: "AI" | "HUMAN" | "CONTACT";
  preview: string;
  sentAt: string;
  channel: "WHATSAPP" | "EMAIL";
  leadId: string;
  leadStatus: "COLD" | "WARM" | "HOT" | "HANDED_OFF" | "OPTED_OUT";
  contactName: string;
};

const STATUS_COLOR: Record<string, string> = {
  COLD: "text-slate-500",
  WARM: "text-warning-700",
  HOT: "text-danger-700",
  HANDED_OFF: "text-brand-700",
  OPTED_OUT: "text-slate-400",
};

/**
 * Feed ao vivo de mensagens enviadas/recebidas. Polling a cada 5s.
 *
 * Não usamos WebSocket porque seria muita complexidade pra pouco ganho —
 * polling a 5s já dá a sensação de "tá vivo" que o cliente pediu.
 */
export function ActivityFeed() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/dashboard/activity", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await res.json()) as { items: Item[] };
        if (!cancelled) {
          setItems(data.items);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
          </span>
          <CardTitle>Atividade ao vivo</CardTitle>
        </div>
        <Badge variant="neutral" size="sm">
          atualiza a cada 5s
        </Badge>
      </CardHeader>

      <div className="max-h-[480px] overflow-y-auto px-2 py-1">
        {items === null && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Carregando…</p>
        )}
        {error && (
          <p className="px-4 py-6 text-center text-sm text-danger-700">
            Erro ao buscar atividade. Tentando de novo…
          </p>
        )}
        {items !== null && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Nenhuma mensagem ainda. Quando seu trabalho começar a disparar, aparece aqui em tempo real.
          </p>
        )}
        {items !== null && items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {items.map((m) => (
              <FeedRow key={m.id} item={m} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function FeedRow({ item }: { item: Item }) {
  const isOut = item.direction === "OUTBOUND";
  const arrow = isOut ? "→" : "←";
  const arrowColor = isOut
    ? item.sender === "HUMAN"
      ? "text-slate-700"
      : "text-brand-600"
    : "text-success-600";
  const verb = isOut
    ? item.sender === "HUMAN"
      ? "você"
      : "IA"
    : "contato";

  return (
    <li>
      <Link
        href={`/painel/leads/${item.leadId}`}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <span className={`text-lg font-bold ${arrowColor}`}>{arrow}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {item.contactName}
            </p>
            <span className={`text-2xs uppercase tracking-wider ${STATUS_COLOR[item.leadStatus]}`}>
              {item.leadStatus.toLowerCase()}
            </span>
            <span className="text-2xs text-slate-400">
              · {item.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"}
            </span>
            <span className="ml-auto text-2xs text-slate-400 whitespace-nowrap">
              {timeAgo(item.sentAt)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-600">
            <span className="text-slate-400">{verb}: </span>
            {item.preview || <em className="text-slate-300">vazio</em>}
          </p>
        </div>
      </Link>
    </li>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "agora";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
