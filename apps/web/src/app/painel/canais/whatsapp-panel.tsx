"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  connectWhatsAppAction,
  disconnectWhatsAppAction,
  switchWhatsAppNumberAction,
} from "./actions";

type Status = "DISCONNECTED" | "CONNECTING" | "QR_PENDING" | "CONNECTED" | "BANNED";

interface SessionData {
  status: Status;
  qrCode: string | null;
  phoneNumber: string | null;
  lastConnectedAt: Date | string | null;
  hasStoredAuth: boolean;
}

const STATUS_BADGE: Record<Status, { label: string; variant: "neutral" | "brand" | "warning" | "success" | "danger" }> = {
  DISCONNECTED: { label: "Desconectado", variant: "neutral" },
  CONNECTING: { label: "Conectando", variant: "brand" },
  QR_PENDING: { label: "Aguardando QR", variant: "warning" },
  CONNECTED: { label: "Conectado", variant: "success" },
  BANNED: { label: "Bloqueado", variant: "danger" },
};

export function WhatsAppPanel({ initial }: { initial: SessionData | null }) {
  const [session, setSession] = useState<SessionData>(
    initial ?? {
      status: "DISCONNECTED",
      qrCode: null,
      phoneNumber: null,
      lastConnectedAt: null,
      hasStoredAuth: false,
    }
  );
  const [isPending, startTransition] = useTransition();

  // Timestamp do último click em "Conectar" — usado pra manter polling ativo
  // mesmo se o DB transitar pra DISCONNECTED brevemente (race com worker).
  // Sem isso o polling parava quando local state caía pra DISCONNECTED, e o
  // CONNECTED subsequente nunca era detectado (user tinha que F5).
  const [connectingSince, setConnectingSince] = useState<number | null>(null);

  useEffect(() => {
    const recentlyConnecting =
      connectingSince !== null && Date.now() - connectingSince < 5 * 60_000;
    const polling =
      ["CONNECTING", "QR_PENDING"].includes(session.status) || recentlyConnecting;
    if (!polling) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as SessionData;
          setSession(data);
          // Parou definitivamente — limpa o intent flag
          if (data.status === "CONNECTED" || data.status === "BANNED") {
            setConnectingSince(null);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [session.status, connectingSince]);

  const cfg = STATUS_BADGE[session.status];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600">
            <WhatsAppIcon />
          </div>
          <div>
            <CardTitle>WhatsApp</CardTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              {session.phoneNumber
                ? `Conectado como +${session.phoneNumber}`
                : "Conecte um número aquecido para começar"}
            </p>
          </div>
        </div>

        <Badge variant={cfg.variant} dot>
          {cfg.label}
        </Badge>
      </CardHeader>

      <CardContent>
        {session.status === "DISCONNECTED" && (
          <Disconnected
            pending={isPending}
            hasStoredAuth={session.hasStoredAuth}
            phoneNumber={session.phoneNumber}
            onConnect={() =>
              startTransition(async () => {
                await connectWhatsAppAction();
                setConnectingSince(Date.now());
                setSession({ ...session, status: "CONNECTING" });
              })
            }
            onSwitchNumber={() =>
              startTransition(async () => {
                if (
                  !confirm(
                    "Limpar a sessão atual e escanear QR com OUTRO número? A sessão anterior será descartada."
                  )
                )
                  return;
                await switchWhatsAppNumberAction();
                setConnectingSince(Date.now());
                setSession({
                  ...session,
                  status: "CONNECTING",
                  qrCode: null,
                  phoneNumber: null,
                  hasStoredAuth: false,
                });
              })
            }
          />
        )}

        {session.status === "CONNECTING" && (
          <Connecting
            onCancel={() =>
              startTransition(async () => {
                await disconnectWhatsAppAction(false);
                setSession({ ...session, status: "DISCONNECTED", qrCode: null });
              })
            }
          />
        )}

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
                setSession({ status: "DISCONNECTED", qrCode: null, phoneNumber: null, lastConnectedAt: null, hasStoredAuth: false });
              })
            }
          />
        )}

        {session.status === "BANNED" && (
          <Banned
            pending={isPending}
            onClearSession={() =>
              startTransition(async () => {
                if (
                  !confirm(
                    "Limpar credenciais do número banido? Você precisará conectar um número novo (aquecido) e escanear o QR."
                  )
                )
                  return;
                await disconnectWhatsAppAction(true);
                setSession({
                  status: "DISCONNECTED",
                  qrCode: null,
                  phoneNumber: null,
                  lastConnectedAt: null,
                  hasStoredAuth: false,
                });
              })
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function Disconnected({
  pending,
  hasStoredAuth,
  phoneNumber,
  onConnect,
  onSwitchNumber,
}: {
  pending: boolean;
  hasStoredAuth: boolean;
  phoneNumber: string | null;
  onConnect: () => void;
  onSwitchNumber: () => void;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {hasStoredAuth ? "Sessão anterior detectada" : "Conecte seu WhatsApp"}
        </h3>

        {hasStoredAuth ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Existe uma sessão salva
              {phoneNumber ? (
                <> do número <strong>+{phoneNumber}</strong></>
              ) : null}
              . Você pode reconectar a mesma sessão (sem escanear QR de novo) ou trocar para um número diferente.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                onClick={onConnect}
                disabled={pending}
              >
                {pending ? "Iniciando…" : "↻ Reconectar mesmo número"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onSwitchNumber}
                disabled={pending}
              >
                ⇄ Trocar número (novo QR)
              </Button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              "Trocar número" descarta a sessão atual e exige escanear um QR novo.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Vamos gerar um QR Code para escanear com o WhatsApp do número que vai usar para prospectar.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <Item>Use um número aquecido (uso normal há semanas)</Item>
              <Item>Janela de envio: 7h às 22h</Item>
              <Item>Intervalo humano entre mensagens: 25 a 90s</Item>
              <Item>Opt-out automático para palavras como "sair", "parar"</Item>
            </ul>
            <Button
              variant="primary"
              size="lg"
              className="mt-6"
              onClick={onConnect}
              disabled={pending}
            >
              {pending ? "Iniciando…" : "Conectar WhatsApp"}
            </Button>
          </>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Pré-requisito: worker rodando. Use{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">pnpm dev</code> na raiz para subir web + worker juntos.
        </p>
      </div>
      <div className="hidden md:flex items-center justify-center">
        <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <QRPlaceholder />
        </div>
      </div>
    </div>
  );
}

function Connecting({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isStuck = elapsed > 25;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <Spinner />
      <p className="text-sm font-medium text-slate-700">
        {isStuck
          ? "Está demorando mais que o normal…"
          : "Inicializando sessão com o WhatsApp…"}
      </p>
      <p className="text-xs text-slate-500">
        {isStuck ? `${elapsed}s decorridos` : "Isso pode levar até 30 segundos."}
      </p>

      {isStuck && (
        <div className="mt-4 max-w-md rounded-xl border border-warning-200 bg-warning-50 p-4 text-left text-sm text-warning-900">
          <p className="font-semibold">⚠️ O worker pode estar offline.</p>
          <p className="mt-1 text-warning-800">
            Em outro terminal, na raiz do projeto:
          </p>
          <code className="mt-1 block rounded bg-warning-100 px-2 py-1 text-xs">
            pnpm dev
          </code>
          <p className="mt-2 text-warning-800">
            (sobe web + worker juntos). Depois clique em "Cancelar e tentar novamente".
          </p>
        </div>
      )}

      <Button variant="outline" size="sm" className="mt-4" onClick={onCancel}>
        Cancelar e tentar novamente
      </Button>
    </div>
  );
}

function QRPending({ qrDataUrl, onCancel }: { qrDataUrl: string; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
      <div className="flex flex-col items-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
          <Image src={qrDataUrl} alt="QR Code WhatsApp" width={280} height={280} unoptimized />
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Escaneie com seu WhatsApp</h3>
        <ol className="mt-5 space-y-3 text-sm text-slate-700">
          <Step n={1}>Abra o WhatsApp no celular</Step>
          <Step n={2}>
            Toque em <strong>Mais opções ⋮</strong> → <strong>Aparelhos conectados</strong>
          </Step>
          <Step n={3}>
            Toque em <strong>Conectar aparelho</strong>
          </Step>
          <Step n={4}>Aponte a câmera para este QR</Step>
        </ol>
        <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          ⏱ O QR muda automaticamente a cada ~60s. Esta tela atualiza sozinha.
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
    <div className="space-y-5">
      <div className="rounded-xl bg-success-50 border border-success-100 p-4">
        <p className="text-sm text-success-800">
          ✓ Tudo certo. Seu WhatsApp <strong>+{phoneNumber}</strong> está pronto para enviar e
          receber mensagens. Janela 7h-22h e delay 25-90s aplicados automaticamente.
        </p>
      </div>

      {lastConnectedAt && (
        <p className="text-xs text-slate-500">
          Conectado desde {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(lastConnectedAt))}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
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

function Banned({ pending, onClearSession }: { pending: boolean; onClearSession: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-900">
        <p className="font-semibold">Este número foi bloqueado pelo WhatsApp.</p>
        <p className="mt-1">
          Limpe a sessão e use outro número. Para reduzir risco: use número aquecido, respeite delays
          e evite envios em massa idênticos.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="font-semibold text-slate-900">Como sair desse estado</h4>
        <ol className="mt-2 space-y-1 text-sm text-slate-700">
          <li><strong>1.</strong> Clique em <strong>Limpar sessão e trocar de número</strong> abaixo</li>
          <li><strong>2.</strong> Conecte um <strong>número aquecido novo</strong> (~2 semanas de uso pessoal)</li>
          <li><strong>3.</strong> Não reutilize o chip banido — fica marcado pelo WhatsApp</li>
        </ol>
        <Button
          variant="destructive"
          size="lg"
          className="mt-4"
          onClick={onClearSession}
          disabled={pending}
        >
          {pending ? "Limpando…" : "Limpar sessão e trocar de número"}
        </Button>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon />
      <span>{children}</span>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.296a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-2xs font-bold text-white">
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

function QRPlaceholder() {
  return (
    <svg className="h-20 w-20 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="4" height="4" />
      <rect x="14" y="19" width="2" height="2" />
      <rect x="19" y="14" width="2" height="4" />
      <rect x="17" y="17" width="4" height="2" />
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
