import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-bold text-brand-900">Refidim</div>
          <nav className="flex gap-4 text-sm">
            <Link href="/login" className="text-gray-700 hover:text-brand-600">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section className="mt-24">
          <h1 className="text-5xl font-bold leading-tight text-gray-900">
            Pare de perder lead quente
            <br />
            <span className="text-brand-600">por falta de tempo.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-gray-600">
            O Refidim trabalha contatos automaticamente, conversa de forma natural
            e entrega apenas oportunidades prontas para o humano assumir.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              href="/cadastro"
              className="rounded-md bg-brand-600 px-6 py-3 text-white hover:bg-brand-700"
            >
              Começar agora
            </Link>
            <Link
              href="#planos"
              className="rounded-md border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
            >
              Ver planos
            </Link>
          </div>
        </section>

        <footer className="mt-32 border-t border-gray-200 pt-8 text-sm text-gray-500">
          © {new Date().getFullYear()} Refidim · refidim.com.br
        </footer>
      </div>
    </main>
  );
}
