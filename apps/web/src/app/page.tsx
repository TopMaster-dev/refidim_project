import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    body: "Aviso quando o lead pede reunião, demonstração ou proposta. Foco no que importa.",
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
    description: "Para quem está começando a estruturar a prospecção.",
    features: ["1 consultor", "Até 3.000 leads/mês", "WhatsApp + E-mail", "Classificação automática"],
  },
  {
    name: "Pro",
    price: 197,
    description: "Para equipes pequenas que querem escala.",
    highlight: true,
    features: ["Até 3 consultores", "Até 8.000 leads/mês", "Extrator Google", "Alertas em tempo real"],
  },
  {
    name: "Scale",
    price: 397,
    description: "Para operações comerciais maduras.",
    features: ["Consultores ilimitados", "Até 20.000 leads/mês", "Prioridade no suporte", "API próxima"],
  },
];

const TRUST = [
  "Sem cartão de crédito",
  "Cancele quando quiser",
  "Suporte por WhatsApp",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="container-app flex h-16 items-center justify-between">
          <Logo variant="full" size="md" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#funciona" className="transition-colors hover:text-slate-900">Como funciona</a>
            <a href="#planos" className="transition-colors hover:text-slate-900">Planos</a>
            <Link href="/login" className="transition-colors hover:text-slate-900">Entrar</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

        <div className="container-app relative pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <Badge variant="outline" className="mb-7" dot>
              <span className="text-slate-700">IA + prospecção humana</span>
            </Badge>

            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.04]">
              Pare de perder
              <br />
              <span className="bg-gradient-to-br from-brand-500 via-brand-600 to-slate-900 bg-clip-text text-transparent">
                lead quente
              </span>{" "}
              por falta de tempo.
            </h1>

            <p className="mt-7 text-lg leading-relaxed text-slate-600 sm:text-xl max-w-2xl mx-auto">
              O Refidim trabalha contatos automaticamente, conversa de forma natural e entrega
              apenas oportunidades prontas para o humano assumir.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="primary" size="xl" className="w-full sm:w-auto">
                <Link href="/cadastro">Começar grátis por 7 dias →</Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="#funciona">Ver como funciona</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {TRUST.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-success-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="funciona" className="border-t border-slate-200/60 bg-slate-50/50 py-24 sm:py-32">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="brand" className="mb-4">Como funciona</Badge>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Um sistema. Conversas reais.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Tudo o que você precisa para transformar listas em oportunidades, sem precisar
              ficar respondendo um por um.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
                  <f.icon />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 sm:py-32">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="brand" className="mb-4">Planos</Badge>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Comece pequeno. Escale quando quiser.
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "relative rounded-2xl bg-slate-900 p-8 text-white shadow-xl ring-1 ring-slate-800"
                    : "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                }
              >
                {p.highlight && (
                  <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-md">
                    Mais escolhido
                  </Badge>
                )}
                <h3 className={p.highlight ? "text-2xl font-bold" : "text-2xl font-bold text-slate-900"}>
                  {p.name}
                </h3>
                <p className={p.highlight ? "mt-2 text-sm text-slate-300" : "mt-2 text-sm text-slate-500"}>
                  {p.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className={p.highlight ? "text-5xl font-bold tabular" : "text-5xl font-bold text-slate-900 tabular"}>
                    R${p.price}
                  </span>
                  <span className={p.highlight ? "text-sm text-slate-400" : "text-sm text-slate-500"}>/mês</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((feat) => (
                    <li key={feat} className={p.highlight ? "flex items-start gap-2 text-sm text-slate-200" : "flex items-start gap-2 text-sm text-slate-700"}>
                      <CheckIcon className={p.highlight ? "mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" : "mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600"} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={p.highlight ? "primary" : "outline"} size="lg" className="mt-8 w-full">
                  <Link href="/cadastro">Começar com {p.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200/60 bg-slate-50/50">
        <div className="container-app py-24 text-center sm:py-32">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Pronto para parar de perder oportunidades?
          </h2>
          <p className="mt-5 text-lg text-slate-600">
            7 dias grátis. Sem cartão. Sem complicação.
          </p>
          <Button asChild variant="primary" size="xl" className="mt-10">
            <Link href="/cadastro">Criar conta agora →</Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/60 py-10">
        <div className="container-app flex flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
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
      <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.296-7.296a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function ChatIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function ThermometerIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>;
}
function SendIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}
function ListIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="0.5" fill="currentColor" /><circle cx="3.5" cy="12" r="0.5" fill="currentColor" /><circle cx="3.5" cy="18" r="0.5" fill="currentColor" /></svg>;
}
function BellIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function SlidersIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>;
}
