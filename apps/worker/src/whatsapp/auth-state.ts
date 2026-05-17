import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { prisma } from "@refidim/database";

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
    const serialized = JSON.parse(
      JSON.stringify({ creds, keys }, BufferJSON.replacer)
    );
    await prisma.whatsAppSession.update({
      where: { userId },
      data: { authState: serialized },
    });
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
          await persist();
        },
      },
    },
    saveCreds: persist,
  };
}
