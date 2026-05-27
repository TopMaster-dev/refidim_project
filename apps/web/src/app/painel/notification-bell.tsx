"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type Reply = {
  id: string;
  preview: string;
  sentAt: string;
  channel: "WHATSAPP" | "EMAIL";
  leadId: string;
  leadStatus: string;
  contactName: string;
};

const LS_KEY = "refidim_notifications_last_seen";

/**
 * Sino de notificações no topo. Pola /api/notifications a cada 10s.
 * Mostra badge com quantidade de respostas novas (desde o último "visto"),
 * dispara som + notificação do browser quando chega resposta nova.
 */
export function NotificationBell() {
  const [items, setItems] = useState<Reply[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    const v = window.localStorage.getItem(LS_KEY);
    return v ? Number(v) : Date.now();
  });
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unread = items.filter((i) => new Date(i.sentAt).getTime() > lastSeen).length;

  const playSound = useCallback(() => {
    try {
      // Beep curto via WebAudio (sem precisar de arquivo)
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    // Pede permissão de notificação do browser uma vez
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Reply[] };
        if (cancelled) return;

        // Detecta respostas realmente novas (id não visto)
        const newOnes = data.items.filter((i) => !knownIds.current.has(i.id));
        for (const i of data.items) knownIds.current.add(i.id);

        // No primeiro load não notifica (evita spam ao abrir a página)
        if (!firstLoad.current && newOnes.length > 0) {
          const newest = newOnes[0]!;
          playSound();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            const n = new Notification(`💬 ${newest.contactName} respondeu`, {
              body: newest.preview || "Nova resposta recebida",
              icon: "/logo-icon.svg",
              tag: newest.id,
            });
            n.onclick = () => {
              window.focus();
              window.location.href = `/painel/leads/${newest.leadId}`;
            };
          }
        }
        firstLoad.current = false;
        setItems(data.items);
      } catch {
        // ignora
      }
    };

    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [playSound]);

  const markSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, String(now));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markSeen();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificações"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger-500 px-1 text-2xs font-bold text-white ring-2 ring-white animate-scale-in">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Respostas recentes</p>
              <Link
                href="/painel/leads"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Ver leads
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma resposta ainda
                </p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {items.slice(0, 12).map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/painel/leads/${i.leadId}`}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-success-600">←</span>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {i.contactName}
                          </p>
                          <span className="ml-auto text-2xs text-slate-400">
                            {timeAgo(i.sentAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate pl-5 text-xs text-slate-600">
                          {i.preview || "—"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
