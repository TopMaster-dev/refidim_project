import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { prisma } from "@refidim/database";
import { logger } from "../logger.js";

/**
 * Persiste credenciais e keys do Baileys em WhatsAppSession.authState (Json no Postgres).
 *
 * O Baileys espera duas APIs:
 *   - state.creds (com saveCreds para persistir)
 *   - state.keys.get/set (signal protocol keys)
 *
 * Tudo é serializado via BufferJSON (Baileys helper) que preserva Buffers.
 */
export async function usePostgresAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  // Carrega o blob atual
  const session = await prisma.whatsAppSession.findUnique({
    where: { userId },
    select: { authState: true },
  });

  const parsed = session?.authState
    ? JSON.parse(JSON.stringify(session.authState), BufferJSON.reviver)
    : null;

  const creds: AuthenticationCreds = parsed?.creds ?? initAuthCreds();
  const keys: Record<string, Record<string, unknown>> = parsed?.keys ?? {};

  const persist = async () => {
    try {
      const serialized = JSON.parse(
        JSON.stringify({ creds, keys }, BufferJSON.replacer)
      );
      await prisma.whatsAppSession.update({
        where: { userId },
        data: { authState: serialized },
      });
    } catch (err) {
      // CRÍTICO: sem catch, uma falha aqui (Postgres pool esgotado, query
      // travada) virava unhandledRejection e matava o worker. Auditoria 28/05.
      logger.error({ err, userId }, "Falha ao persistir credenciais WhatsApp");
    }
  };

  // Debounce: Baileys emite creds.update 5-50x/h durante sync de chaves Signal.
  // Sem throttle, eram 5-50 prisma.update() por hora, saturando o pool de conexões
  // do Postgres em horas. Coalescimos chamadas próximas (3s) em uma só persistência.
  // Auditoria 28/05.
  let saveTimer: NodeJS.Timeout | null = null;
  let savePending = false;
  const debouncedPersist = async () => {
    savePending = true;
    if (saveTimer) return;
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      if (!savePending) return;
      savePending = false;
      await persist();
    }, 3000);
  };

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ) => {
          const result: Record<string, SignalDataTypeMap[T]> = {};
          for (const id of ids) {
            const value = keys[type]?.[id] as SignalDataTypeMap[T] | undefined;
            if (value) {
              if (type === "app-state-sync-key") {
                result[id] = proto.Message.AppStateSyncKeyData.fromObject(
                  value as object
                ) as unknown as SignalDataTypeMap[T];
              } else {
                result[id] = value;
              }
            }
          }
          return result;
        },
        set: async (data) => {
          for (const category in data) {
            const cat = category as keyof SignalDataTypeMap;
            const map = data[cat] as Record<string, unknown> | undefined;
            if (!map) continue;
            if (!keys[cat]) keys[cat] = {};
            for (const id in map) {
              const value = map[id];
              if (value === null || value === undefined) {
                delete keys[cat][id];
              } else {
                keys[cat][id] = value;
              }
            }
          }
          // Use debounced — auditoria mostrou que set() é chamado dezenas de
          // vezes por mensagem recebida (signal protocol), antes era 1 prisma.update
          // por chamada → DB saturação. Agora 1 update a cada 3s.
          await debouncedPersist();
        },
      },
    },
    saveCreds: debouncedPersist,
  };
}
