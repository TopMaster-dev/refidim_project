"use client";

import { useState, useTransition } from "react";
import type { EmailAccount } from "@refidim/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmailAccountAction,
  deleteEmailAccountAction,
  toggleEmailAccountActiveAction,
} from "./email-actions";

interface Consultant {
  id: string;
  name: string;
}

// EmailAccount mas sem senhas (não retornadas pra client)
type SafeEmailAccount = Omit<EmailAccount, "smtpPassEnc" | "imapPassEnc">;

export function EmailPanel({
  accounts,
  consultants,
}: {
  accounts: SafeEmailAccount[];
  consultants: Consultant[];
}) {
  const [showForm, setShowForm] = useState(accounts.length === 0);

  return (
    <section className="rounded-2xl border border-navy-100 bg-white shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <MailIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900">E-mail</h2>
            <p className="text-sm text-navy-600">
              {accounts.length === 0
                ? "Conecte uma conta SMTP/IMAP"
                : `${accounts.length} ${accounts.length === 1 ? "conta conectada" : "contas conectadas"}`}
            </p>
          </div>
        </div>

        {accounts.length > 0 && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Adicionar conta
          </Button>
        )}
      </header>

      <div className="px-6 py-6">
        {accounts.length > 0 && (
          <ul className="mb-6 space-y-3">
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} />
            ))}
          </ul>
        )}

        {showForm && (
          <AccountForm
            consultants={consultants}
            onCancel={accounts.length > 0 ? () => setShowForm(false) : undefined}
          />
        )}
      </div>
    </section>
  );
}

function AccountRow({ account }: { account: SafeEmailAccount }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-navy-900">{account.fromEmail}</p>
          <span
            className={
              account.isActive
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                : "rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-700"
            }
          >
            {account.isActive ? "Ativo" : "Pausado"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-navy-600">
          {account.fromName} · SMTP {account.smtpHost}:{account.smtpPort}
          {account.imapHost && ` · IMAP ${account.imapHost}:${account.imapPort}`}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            startTransition(() => toggleEmailAccountActiveAction(account.id))
          }
          disabled={isPending}
        >
          {account.isActive ? "Pausar" : "Ativar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Remover ${account.fromEmail}?`)) {
              startTransition(() => deleteEmailAccountAction(account.id));
            }
          }}
          disabled={isPending}
        >
          Remover
        </Button>
      </div>
    </li>
  );
}

function AccountForm({
  consultants,
  onCancel,
}: {
  consultants: Consultant[];
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showImap, setShowImap] = useState(false);
  const [preset, setPreset] = useState<"gmail" | "outlook" | "custom">("gmail");
  const [fromEmail, setFromEmail] = useState("");

  // Defaults por provedor
  const presets = {
    gmail: { smtpHost: "smtp.gmail.com", smtpPort: 587, imapHost: "imap.gmail.com", imapPort: 993 },
    outlook: { smtpHost: "smtp.office365.com", smtpPort: 587, imapHost: "outlook.office365.com", imapPort: 993 },
    custom: { smtpHost: "", smtpPort: 587, imapHost: "", imapPort: 993 },
  };
  const p = presets[preset];

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const r = await createEmailAccountAction(formData);
          if (r?.error) setError(r.error);
          else {
            const form = document.getElementById("email-form") as HTMLFormElement;
            form?.reset();
            if (onCancel) onCancel();
          }
        });
      }}
      id="email-form"
      className="space-y-5"
    >
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        <strong>📌 Importante:</strong> se for Gmail, gere uma{" "}
        <a
          href="https://support.google.com/accounts/answer/185833"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          senha de app
        </a>{" "}
        e use ela aqui (não funciona com sua senha normal).
      </div>

      <div className="space-y-2">
        <Label>Provedor</Label>
        <div className="flex gap-2">
          {(["gmail", "outlook", "custom"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPreset(option)}
              className={
                preset === option
                  ? "rounded-md border-2 border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"
                  : "rounded-md border border-navy-200 px-3 py-1.5 text-xs text-navy-700 hover:bg-navy-50"
              }
            >
              {option === "gmail" && "Gmail / Workspace"}
              {option === "outlook" && "Outlook / 365"}
              {option === "custom" && "Outro (SMTP)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fromEmail">E-mail remetente</Label>
          <Input
            id="fromEmail"
            name="fromEmail"
            type="email"
            required
            placeholder="contato@empresa.com.br"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </div>
        <Field name="fromName" label="Nome remetente" required placeholder="João da Refidim" />
      </div>

      <h3 className="border-t border-navy-100 pt-5 font-semibold text-navy-900">
        SMTP (envio)
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field name="smtpHost" label="Host SMTP" required defaultValue={p.smtpHost} />
        <Field name="smtpPort" label="Porta" type="number" required defaultValue={String(p.smtpPort)} />
        <div className="space-y-2">
          <Label htmlFor="smtpUser">Usuário (geralmente igual ao e-mail remetente)</Label>
          <Input
            id="smtpUser"
            name="smtpUser"
            required
            placeholder="seu@email.com"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </div>
        <Field name="smtpPass" label="Senha (ou app password)" type="password" required />
      </div>

      <div className="flex items-center gap-2 border-t border-navy-100 pt-5">
        <input
          id="show-imap"
          type="checkbox"
          checked={showImap}
          onChange={(e) => setShowImap(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="show-imap" className="text-sm font-medium text-navy-700">
          Configurar IMAP (para receber respostas) — recomendado
        </label>
      </div>

      {showImap && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field name="imapHost" label="Host IMAP" defaultValue={p.imapHost} />
          <Field name="imapPort" label="Porta IMAP" type="number" defaultValue={String(p.imapPort)} />
          <Field name="imapUser" label="Usuário IMAP" placeholder="(geralmente igual ao SMTP)" />
          <Field name="imapPass" label="Senha IMAP" type="password" placeholder="(geralmente igual ao SMTP)" />
        </div>
      )}

      {consultants.length > 0 && (
        <div className="space-y-2 border-t border-navy-100 pt-5">
          <Label htmlFor="consultantId">Vincular a um consultor (opcional)</Label>
          <select
            id="consultantId"
            name="consultantId"
            className="h-11 w-full rounded-lg border border-navy-200 px-3 text-sm"
          >
            <option value="">Conta da empresa (todos os consultores podem usar)</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="gradient" disabled={isPending}>
          {isPending ? "Testando conexão…" : "Adicionar conta"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
