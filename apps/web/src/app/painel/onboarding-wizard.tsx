import Link from "next/link";

type StepStatus = "done" | "pending" | "locked";

interface Step {
  number: number;
  title: string;
  description: string;
  status: StepStatus;
  href: string;
  ctaLabel: string;
}

interface OnboardingState {
  hasConsultant: boolean;
  hasChannel: boolean;
  hasList: boolean;
  hasJob: boolean;
}

/**
 * Mostra os 4 passos pra ter o sistema funcionando, com check do que já foi feito.
 * Some quando todos os passos estão completos.
 */
export function OnboardingWizard({ state }: { state: OnboardingState }) {
  const allDone = state.hasConsultant && state.hasChannel && state.hasList && state.hasJob;
  if (allDone) return null;

  const steps: Step[] = [
    {
      number: 1,
      title: "Configure o consultor",
      description: "A identidade que vai conversar com seus leads. Empresa, produto, tom, objetivo.",
      status: state.hasConsultant ? "done" : "pending",
      href: "/painel/consultores",
      ctaLabel: state.hasConsultant ? "Revisar" : "Criar consultor",
    },
    {
      number: 2,
      title: "Conecte um canal",
      description: "WhatsApp via QR Code, e-mail via SMTP/IMAP. A IA precisa de pelo menos um canal.",
      status: !state.hasConsultant ? "locked" : state.hasChannel ? "done" : "pending",
      href: "/painel/canais",
      ctaLabel: state.hasChannel ? "Gerenciar" : "Conectar agora",
    },
    {
      number: 3,
      title: "Importe ou extraia uma lista",
      description: "CSV com seus contatos ou usa o extrator do Google Places por segmento+cidade.",
      status: !state.hasChannel ? "locked" : state.hasList ? "done" : "pending",
      href: "/painel/listas",
      ctaLabel: state.hasList ? "Ver listas" : "Criar lista",
    },
    {
      number: 4,
      title: "Crie e inicie um trabalho",
      description: "Junta consultor + lista + canal. A IA começa a abordar automaticamente.",
      status: !state.hasList ? "locked" : state.hasJob ? "done" : "pending",
      href: "/painel/trabalhos",
      ctaLabel: state.hasJob ? "Ver trabalhos" : "Criar trabalho",
    },
  ];

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = (doneCount / steps.length) * 100;

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 shadow-soft">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Comece em 4 passos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configurando esses passos, sua IA já consegue começar a prospectar.
          </p>
        </div>
        <div className="text-sm font-medium text-brand-700 tabular">
          {doneCount} de {steps.length} concluído{doneCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full bg-brand-gradient transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const isLocked = step.status === "locked";
  const isDone = step.status === "done";

  const cardClass = isDone
    ? "border-success-300 bg-success-50/50"
    : isLocked
      ? "border-slate-200 bg-slate-50/50 opacity-60"
      : "border-brand-300 bg-white shadow-sm ring-1 ring-brand-200";

  return (
    <div className={`rounded-xl border p-4 transition-all ${cardClass}`}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={
            isDone
              ? "flex h-7 w-7 items-center justify-center rounded-full bg-success-500 text-white"
              : isLocked
                ? "flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-500 font-semibold"
                : "flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white font-semibold"
          }
        >
          {isDone ? <CheckIcon /> : step.number}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">{step.description}</p>
      {isLocked ? (
        <span className="text-xs text-slate-400">— complete o passo anterior</span>
      ) : (
        <Link
          href={step.href}
          className={
            isDone
              ? "text-xs font-semibold text-success-700 hover:text-success-800"
              : "text-xs font-semibold text-brand-700 hover:text-brand-800"
          }
        >
          {step.ctaLabel} →
        </Link>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.296a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
