# Refidim

Sistema de prospecção e qualificação de leads via WhatsApp e e-mail com IA. O Refidim conversa de forma natural com contatos e entrega apenas oportunidades prontas para o humano assumir.

## Arquitetura

Monorepo com `pnpm workspaces`:

```
refidim/
├── apps/
│   ├── web/        Next.js 15 — painel + API routes
│   └── worker/     Node — Baileys (WhatsApp), filas BullMQ, IA, extrator
└── packages/
    ├── database/   Prisma schema + client compartilhado
    └── shared/     Tipos, schemas Zod, constantes
```

## Stack

- **Frontend / API:** Next.js 15 (App Router) + TypeScript + Tailwind
- **Banco:** PostgreSQL + Prisma ORM
- **Filas:** BullMQ + Redis
- **WhatsApp:** Baileys (não-oficial — MVP)
- **E-mail:** Nodemailer (SMTP) + IMAP polling
- **IA:** Claude Haiku 4.5 (Anthropic) — configurável para OpenAI
- **Extrator:** Playwright
- **Pagamentos:** NextGo Pay

## Setup local

### Pré-requisitos
- Node.js ≥ 20
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop (para Postgres + Redis) — ou instâncias locais

### Passos

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example .env

# 3. Subir Postgres + Redis
pnpm docker:up

# 4. Aplicar migrações + seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Rodar tudo em paralelo
pnpm dev
```

Acesse `http://localhost:3000`.

Usuário dev seedado: `admin@refidim.com.br` / `refidim123`

## Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Roda web + worker em paralelo |
| `pnpm db:studio` | Abre o Prisma Studio para inspecionar dados |
| `pnpm db:migrate` | Cria/aplica nova migração |
| `pnpm typecheck` | Type check em todas as packages |
| `pnpm docker:up` | Sobe Postgres + Redis |
| `pnpm docker:down` | Derruba containers (volumes persistem) |
