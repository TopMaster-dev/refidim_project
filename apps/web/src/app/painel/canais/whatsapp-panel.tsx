"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { connectWhatsAppAction, disconnectWhatsAppAction } from "./actions";

type Status =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_PENDING"
  | "CONNECTED"
  | "BANNED";

interface SessionData {
  status: Status;
  qrCode: string | null;
  phoneNumber: string | null;
  lastConnectedAt: Date | string | null;
}

const STATUS_CONFIG: Record<Status, { label: string; tone: string; dot: string }> = {
  DISCONNECTED: {
    label: "Desconectado",
    tone: "bg-navy-100 text-navy-700",
    dot: "bg-navy-400",
  },
  CONNECTING: {
    label: "Conectando…",
    tone: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500 animate-pulse",
  },
  QR_PENDING: {
    label: "Aguardando QR",
    tone: "bg-yellow-50 text-yellow-700",
    dot: "bg-yellow-500 animate-pulse",
  },
  CONNECTED: {
    label: "Conectado",
    tone: "bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  BANNED: {
    label: "Bloqueado pelo WhatsApp",
    tone: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

export function WhatsAppPanel({ initial }: { initial: SessionData | null }) {
  const [session, setSession] = useState<SessionData>(
    initial ?? { status: "DISCONNECTED", qrCode: null, phoneNumber: null, lastConnectedAt: null }
  );
  const [isPending, startTransition] = useTransition();

  // Polling de status quando estiver conectando ou aguardando QR
  useEffect(() => {
    const polling = ["CONNECTING", "QR_PENDING"].includes(session.status);
    if (!polling) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as SessionData;
          setSession(data);
        }
      } catch {
        // ignora
      }
    }, 2000);

    return () => clearInterval(id);
  }, [session.status]);

  const cfg = STATUS_CONFIG[session.status];

  return (
    <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <WhatsAppIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900">WhatsApp</h2>
            <p className="text-sm text-navy-600">
              {session.phoneNumber
                ? `Conectado como +${session.phoneNumber}`
                : "Conecte um número para começar"}
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cfg.tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Estados */}
        {session.status === "DISCONNECTED" && (
          <Disconnected
            pending={isPending}
            onConnect={() =>
              startTransition(async () => {
                await connectWhatsAppAction();
                setSession({ ...session, status: "CONNECTING" });
              })
            }
          />
        )}

        {session.status === "CONNECTING" && <Connecting />}

        {session.status === "QR_PENDING" && session.qrCode && (
          <QRPending
            qrDataUrl={session.qrCode}
            onCancel={() =>
              startTransition(async () => {
                await disconnectWhatsAppAction(false);
                setSession({ ...session, status: "DISCONNECTED", qrCode: null });
              })
            }
          />
        )}

        {session.status === "CONNECTED" && (
          <Connected
            phoneNumber={session.phoneNumber}
            lastConnectedAt={session.lastConnectedAt}
            pending={isPending}
            onDisconnect={() =>
              startTransition(async () => {
                await disconnectWhatsAppAction(false);
                setSession({ ...session, status: "DISCONNECTED" });
              })
            }
            onLogout={() =>
              startTransition(async () => {
                if (!confirm("Desconectar e remover credenciais? Precisará escanear o QR novamente.")) return;
                await disconnectWhatsAppAction(true);
                setSession({ status: "DISCONNECTED", qrCode: null, phoneNumber: null, lastConnectedAt: null });
              })
            }
          />
        )}

        {session.status === "BANNED" && <Banned />}
      </div>
    </section>
  );
}

// ---------- Sub-estados ----------

function Disconnected({ pending, onConnect }: { pending: boolean; onConnect: () => void }) {
  return (
    <div className="text-center">
      <p className="text-navy-700">
        Clique abaixo para gerar um QR Code e conectar seu número.
      </p>
      <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-navy-600">
        <li>• Use um número aquecido (uso normal há semanas)</li>
        <li>• O envio respeita a janela 7h-22h e intervalos humanos (25-90s)</li>
        <li>• Mensagens de opt-out param o bot automaticamente</li>
      </ul>
      <Button variant="gradient" size="lg" className="mt-6" onClick={onConnect} disabled={pending}>
        {pending ? "Iniciando…" : "Conectar WhatsApp"}
      </Button>
    </div>
  );
}

function Connecting() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Spinner />
      <p className="text-navy-600">Inicializando sessão com o WhatsApp…</p>
      <p className="text-xs text-navy-500">
        Isso pode levar até 30 segundos. O worker precisa estar rodando (<code>pnpm dev</code>).
      </p>
    </div>
  );
}

function QRPending({ qrDataUrl, onCancel }: { qrDataUrl: string; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
      <div className="flex flex-col items-center">
        <div className="rounded-2xl border border-navy-200 bg-white p-4 shadow-soft">
          <Image
            src={qrDataUrl}
            alt="QR Code WhatsApp"
            width={280}
            height={280}
            unoptimized
          />
        </div>
        <button
          onClick={onCancel}
          className="mt-4 text-sm text-navy-500 hover:text-navy-700"
        >
          Cancelar
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-navy-900">
          Escaneie com seu WhatsApp
        </h3>
        <ol className="mt-4 space-y-3 text-sm text-navy-700">
          <Step n={1}>Abra o WhatsApp no celular</Step>
          <Step n={2}>
            Toque em <strong>Mais opções</strong> ⋮ → <strong>Aparelhos conectados</strong>
          </Step>
          <Step n={3}>
            Toque em <strong>Conectar aparelho</strong>
          </Step>
          <Step n={4}>Aponte a câmera para este QR Code</Step>
        </ol>
        <p className="mt-4 text-xs text-navy-500">
          O QR muda automaticamente a cada ~60s. Esta tela atualiza sozinha.
        </p>
      </div>
    </div>
  );
}

function Connected({
  phoneNumber,
  lastConnectedAt,
  pending,
  onDisconnect,
  onLogout,
}: {
  phoneNumber: string | null;
  lastConnectedAt: Date | string | null;
  pending: boolean;
  onDisconnect: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-green-50 p-4">
        <p className="text-sm text-green-800">
          ✅ Tudo certo. Seu WhatsApp <strong>+{phoneNumber}</strong> está pronto para
          enviar e receber mensagens. As regras de janela (7h-22h) e delay humano (25-90s)
          são aplicadas automaticamente.
        </p>
      </div>

      {lastConnectedAt && (
        <p className="text-xs text-navy-500">
          Conectado desde{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(lastConnectedAt))}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onDisconnect} disabled={pending}>
          Desconectar (manter sessão)
        </Button>
        <Button variant="destructive" onClick={onLogout} disabled={pending}>
          Sair e limpar sessão
        </Button>
      </div>
    </div>
  );
}

function Banned() {
  return (
    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">Este número foi bloqueado pelo WhatsApp.</p>
      <p className="mt-1">
        Limpe a sessão e use outro número. Para reduzir risco no futuro: use número aquecido,
        respeite delays e evite envios em massa idênticos.
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.16 5.335 5.495 0 12.05 0c3.181 0 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414 0 6.557-5.336 11.892-11.893 11.892-1.99 0-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.711.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}
