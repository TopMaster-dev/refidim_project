import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Conversa humanizada",
    body: "A IA conduz contatos com naturalidade — sem cara de bot, sem menus, sem mensagens robóticas.",
    icon: ChatIcon,
  },
  {
    title: "Classifica leads sozinha",
    body: "Identifica automaticamente frio, morno e quente. Você só assume quando o lead está pronto.",
    icon: ThermometerIcon,
  },
  {
    title: "WhatsApp e e-mail",
    body: "Trabalha contatos onde eles respondem. Sessão real, intervalos humanos, respeitando opt-out.",
    icon: SendIcon,
  },
  {
    title: "Listas próprias ou Google",
    body: "Importe CSV, cole contatos ou extraia direto do Google por segmento e cidade.",
    icon: ListIcon,
  },
  {
    title: "Alertas no momento certo",
    body: "Recebe aviso quando o lead pede reunião, demonstração ou proposta. Foco no que importa.",
    icon: BellIcon,
  },
  {
    title: "Configurável por consultor",
    body: "Defina tom, objetivo, permissões, materiais e palavras proibidas para cada consultor.",
    icon: SlidersIcon,
  },
];

const PLANS = [
  {
    name: "Start",
    price: 97,
    leads: 3000,
    consultants: 1,
    features: ["1 consultor", "3 mil leads/mês", "WhatsApp + E-mail", "Classificação automática"],
  },
  {
    name: "Pro",
    price: 197,
    leads: 8000,
    consultants: 3,
    highlight: true,
    features: ["3 consultores", "8 mil leads/mês", "Extrator Google", "Alertas em tempo real"],
  },
  {
    name: "Scale",
    price: 397,
    leads: 20000,
    consultants: "ilimitados",
    features: ["Consultores ilimitados", "20 mil leads/mês", "Prioridade no suporte", "API próxima"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo variant="full" size="md" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-navy-700 md:flex">
            <a href="#funciona" className="hover:text-navy-900">Como funciona</a>
            <a href="#planos" className="hover:text-navy-900">Planos</a>
            <Link href="/login" className="hover:text-navy-900">Entrar</Link>
          </nav>
          <Button asChild variant="gradient" size="md">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-soft-radial" />
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-400 to-brand-700 opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pt-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-4 py-1.5 text-xs font-medium text-navy-700 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              IA + prospecção humana. Sem cara de bot.
            </div>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-6xl lg:text-7xl">
              Pare de perder
              <br />
              <span className="bg-gradient-to-br from-brand-500 via-brand-700 to-navy-800 bg-clip-text text-transparent">
                lead quente
              </span>{" "}
              por falta de tempo.
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-navy-600 sm:text-xl">
              O Refidim trabalha contatos automaticamente, conversa de forma natural e entrega
              apenas oportunidades prontas para o humano assumir.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="xl">
                <Link href="/cadastro">Começar grátis por 7 dias</Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#funciona">Como funciona</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-navy-500">
              Sem cartão de crédito · WhatsApp + E-mail · Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="funciona" className="border-t border-navy-100 bg-navy-50/40 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-brand-600">
              Como funciona
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
              Um sistema. Conversas reais.
            </p>
            <p className="mt-6 text-lg text-navy-600">
              Tudo o que você precisa para transformar listas em oportunidades, sem precisar
              ficar respondendo um por um.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition-all hover:shadow-elevated hover:-translate-y-0.5"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
                  <f.icon />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-brand-600">
              Planos
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
              Comece pequeno. Escale quando quiser.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "relative rounded-2xl bg-navy-900 p-8 text-white shadow-elevated ring-2 ring-brand-500"
                    : "rounded-2xl border border-navy-200 bg-white p-8 shadow-soft"
                }
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-brand">
                    Mais escolhido
                  </span>
                )}
                <h3
                  className={
                    p.highlight ? "text-2xl font-bold" : "text-2xl font-bold text-navy-900"
                  }
                >
                  {p.name}
                </h3>
                <div className="mt-6 flex items-baseline gap-1">
                  <span
                    className={
                      p.highlight
                        ? "text-5xl font-bold"
                        : "text-5xl font-bold text-navy-900"
                    }
                  >
                    R${p.price}
                  </span>
                  <span
                    className={
                      p.highlight ? "text-sm text-navy-200" : "text-sm text-navy-500"
                    }
                  >
                    /mês
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li
                      key={feat}
                      className={
                        p.highlight
                          ? "flex items-start gap-2 text-sm text-navy-100"
                          : "flex items-start gap-2 text-sm text-navy-700"
                      }
                    >
                      <CheckIcon
                        className={
                          p.highlight ? "mt-0.5 h-4 w-4 text-brand-300" : "mt-0.5 h-4 w-4 text-brand-600"
                        }
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={p.highlight ? "gradient" : "outline"}
                  className="mt-8 w-full"
                >
                  <Link href="/cadastro">Começar com {p.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-navy-100">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8">
          <h2 className="text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
            Pronto para parar de perder oportunidades?
          </h2>
          <p className="mt-6 text-lg text-navy-600">
            7 dias grátis. Sem cartão. Sem complicação.
          </p>
          <Button asChild variant="gradient" size="xl" className="mt-10">
            <Link href="/cadastro">Criar conta agora</Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-navy-100 bg-navy-50/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-navy-500 sm:flex-row">
          <Logo variant="full" size="sm" href={null} />
          <p>© {new Date().getFullYear()} Refidim · refidim.com.br</p>
        </div>
      </footer>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.296a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ThermometerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
