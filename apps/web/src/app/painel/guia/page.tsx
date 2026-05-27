import Link from "next/link";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function GuiaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Estado real pra marcar passos já concluídos
  const [consultants, hasChannel, lists, jobs] = await Promise.all([
    prisma.consultant.count({ where: { userId: user.id, isActive: true } }),
    Promise.all([
      prisma.whatsAppSession.findFirst({ where: { userId: user.id, status: "CONNECTED" }, select: { id: true } }),
      prisma.emailAccount.findFirst({ where: { userId: user.id, isActive: true }, select: { id: true } }),
    ]).then(([w, e]) => !!(w || e)),
    prisma.contactList.count({ where: { userId: user.id } }),
    prisma.job.count({ where: { userId: user.id } }),
  ]);

  const steps = [
    {
      n: 1,
      title: "Crie seu consultor",
      done: consultants > 0,
      color: "from-brand-500 to-brand-700",
      icon: "🧠",
      body: "O consultor é a identidade da IA: quem ela representa, o que vende, o tom e o objetivo. É aqui que você define empresa, produto, diferenciais, objeções comuns e o que a IA NUNCA pode dizer.",
      tips: [
        "Quanto mais completo o contexto, melhor a conversa",
        "Cadastre 5+ aberturas variadas pra não parecer copy-paste",
        "Use variáveis como {nome}, {empresa}, {cidade} nas aberturas",
      ],
      cta: { label: consultants > 0 ? "Ver consultores" : "Criar consultor", href: "/painel/consultores" },
    },
    {
      n: 2,
      title: "Conecte um canal",
      done: hasChannel,
      color: "from-emerald-500 to-emerald-700",
      icon: "🔗",
      body: "A IA precisa de pelo menos um canal pra conversar. WhatsApp via QR Code ou e-mail via SMTP/IMAP. Cada consultor pode ter o próprio e-mail.",
      tips: [
        "WhatsApp: use um número AQUECIDO (veja seção de aquecimento abaixo)",
        "Gmail/Outlook: gere uma 'senha de app', não use a senha normal",
        "O número/conta fica conectado no servidor mesmo com o celular desligado",
      ],
      cta: { label: hasChannel ? "Gerenciar canais" : "Conectar canal", href: "/painel/canais" },
    },
    {
      n: 3,
      title: "Monte uma lista de contatos",
      done: lists > 0,
      color: "from-amber-500 to-orange-600",
      icon: "📋",
      body: "Importe um CSV com seus contatos OU use o Extrator do Google Places pra buscar empresas por segmento + cidade automaticamente.",
      tips: [
        "CSV precisa de: nome + (telefone OU e-mail)",
        "Telefone no formato +55DDNNNNNNNNN",
        "Extrator: 'clínica odontológica' + 'São Paulo, SP' → lista pronta",
      ],
      cta: { label: lists > 0 ? "Ver listas" : "Criar lista", href: "/painel/listas" },
      cta2: { label: "Abrir extrator", href: "/painel/extrator" },
    },
    {
      n: 4,
      title: "Crie e inicie um trabalho",
      done: jobs > 0,
      color: "from-rose-500 to-pink-600",
      icon: "🚀",
      body: "Um trabalho junta consultor + lista + canal + objetivo. Ao iniciar, a IA começa a abordar os contatos automaticamente, respeitando a janela 7h-22h e intervalos humanos.",
      tips: [
        "A IA classifica cada lead em Frio / Morno / Quente",
        "Quando um lead vira Quente, a IA pausa e te avisa pra assumir",
        "Acompanhe tudo ao vivo no Dashboard e na aba Leads",
      ],
      cta: { label: jobs > 0 ? "Ver trabalhos" : "Criar trabalho", href: "/painel/trabalhos" },
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Guia de uso"
        description="Aprenda a operar o Refidim e experimente cada parte enquanto lê. Clique nos botões pra ir direto."
      />

      {/* Banner hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-slate opacity-[0.07]" />
        <div className="relative">
          <h2 className="text-2xl font-bold sm:text-3xl">Do zero ao primeiro lead quente</h2>
          <p className="mt-2 max-w-2xl text-brand-100">
            Em 4 passos seu sistema já está prospectando sozinho. Siga a ordem abaixo — cada
            passo tem um botão pra você testar na hora.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">⚡ Conversa humanizada</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">🔥 Classificação automática</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">📲 WhatsApp + E-mail</span>
          </div>
        </div>
      </div>

      {/* Passos */}
      <div className="space-y-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-2xl shadow-md`}
              >
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                    Passo {s.n}
                  </span>
                  {s.done && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-2xs font-semibold text-success-700">
                      ✓ Concluído
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>

                <ul className="mt-3 space-y-1.5">
                  {s.tips.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-brand-500">→</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={s.cta.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:translate-y-px"
                  >
                    {s.cta.label} →
                  </Link>
                  {s.cta2 && (
                    <Link
                      href={s.cta2.href}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {s.cta2.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Como o sistema trabalha sozinho */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Como o sistema trabalha sozinho</h3>
        <p className="mt-1 text-sm text-slate-600">O fluxo completo, do contato ao fechamento:</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FlowCard step="A" title="Aborda" body="IA envia a primeira mensagem personalizada com variáveis do contato." />
          <FlowCard step="B" title="Conversa" body="Responde dúvidas e objeções no tom configurado, em 5-20s." />
          <FlowCard step="C" title="Classifica" body="Marca cada lead em Frio, Morno ou Quente automaticamente." />
          <FlowCard step="D" title="Entrega" body="Lead quente → IA pausa, te avisa, você assume e fecha." />
        </div>
      </section>

      {/* Aquecimento de WhatsApp */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Aquecimento de WhatsApp (importante)</h3>
            <p className="mt-1 text-sm text-slate-700">
              O WhatsApp bane números novos que disparam pra desconhecidos sem aquecimento. Antes
              de conectar um chip no Refidim:
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-slate-700">
              <li><strong>1.</strong> Use o número como pessoal por ~1 semana (receba mensagens de amigos, mande fotos/áudios)</li>
              <li><strong>2.</strong> Peça pra pessoas salvarem seu número e te mandarem mensagem primeiro</li>
              <li><strong>3.</strong> Faça pequenos disparos manuais (5-10/dia) por mais alguns dias</li>
              <li><strong>4.</strong> Só então conecte no Refidim — começando devagar</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Atalhos rápidos */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Atalhos rápidos</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <QuickLink href="/painel" label="Dashboard" icon="🏠" />
          <QuickLink href="/painel/leads" label="Leads" icon="📈" />
          <QuickLink href="/painel/trabalhos" label="Trabalhos" icon="💼" />
          <QuickLink href="/painel/consultores" label="Consultores" icon="🧠" />
          <QuickLink href="/painel/extrator" label="Extrator" icon="🌐" />
          <QuickLink href="/painel/canais" label="Canais" icon="🔗" />
        </div>
      </section>
    </div>
  );
}

function FlowCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
        {step}
      </div>
      <h4 className="mt-3 font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </Link>
  );
}
