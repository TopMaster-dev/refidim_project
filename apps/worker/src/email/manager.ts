import { prisma } from "@refidim/database";
import { logger } from "../logger.js";
import { startImapForAccount, stopImapForAccount, shutdownAllImap } from "./inbound.js";
import { clearTransporterCache } from "./sender.js";

const POLL_INTERVAL_MS = 30_000;

let pollHandle: NodeJS.Timeout | null = null;
const activeAccountIds = new Set<string>();

export function startEmailManager() {
  if (pollHandle) return;
  logger.info("📬 Email manager iniciado");
  tick().catch((err) => logger.error({ err }, "Erro no tick inicial de e-mail"));
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no tick de e-mail"));
  }, POLL_INTERVAL_MS);
}

export async function stopEmailManager() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
  await shutdownAllImap();
  clearTransporterCache();
  activeAccountIds.clear();
}

async function tick() {
  const accounts = await prisma.emailAccount.findMany({
    where: { isActive: true },
  });

  const currentIds = new Set(accounts.map((a) => a.id));

  // Para contas que deixaram de existir/ativas, desconecta IMAP
  for (const id of activeAccountIds) {
    if (!currentIds.has(id)) {
      await stopImapForAccount(id);
      clearTransporterCache(id);
      activeAccountIds.delete(id);
    }
  }

  // Para novas contas, inicia IMAP (se tiverem config)
  for (const account of accounts) {
    if (!activeAccountIds.has(account.id) && account.imapHost) {
      await startImapForAccount(account);
      activeAccountIds.add(account.id);
    } else if (!activeAccountIds.has(account.id)) {
      activeAccountIds.add(account.id); // conta sem IMAP — só SMTP
    }
  }
}
