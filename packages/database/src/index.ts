import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Sempre cachear no global — sem isso, cada import em produção criaria uma nova
// instância de PrismaClient com seu próprio pool de conexões. Em poucas horas
// o Postgres atinge max_connections e o worker trava. Bug crítico encontrado
// na auditoria de leak (28/05).
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

export * from "@prisma/client";
