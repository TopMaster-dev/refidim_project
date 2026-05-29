import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import { prisma, WhatsAppStatus, Prisma } from "@refidim/database";
import { logger } from "../logger.js";
import { usePostgresAuthState } from "./auth-state.js";
import { handleIncomingMessage } from "./inbound.js";

interface SessionHandlers {
  credsUpdate: (...args: unknown[]) => unknown;
  connectionUpdate: (...args: unknown[]) => unknown;
  messagesUpsert: (...args: unknown[]) => unknown;
}

interface ActiveSession {
  socket: WASocket;
  userId: string;
  // Refs nomeadas pros listeners — sem isso não conseguimos remover via .off()
  // e cada reconexão deixa listeners orfãos no event emitter (memory leak
  // identificado pela auditoria 28/05).
  handlers: SessionHandlers;
}

const sessions = new Map<string, ActiveSession>();

function unregisterSocketListeners(sock: WASocket, handlers: SessionHandlers) {
  try {
    sock.ev.off("creds.update", handlers.credsUpdate);
    sock.ev.off("connection.update", handlers.connectionUpdate);
    sock.ev.off("messages.upsert", handlers.messagesUpsert);
  } catch {
    // ignora erros de remoção (ev pode já estar destruído)
  }
}

const baileysLogger = pino({ level: "silent" });

/**
 * Inicia ou recupera uma sessão WhatsApp para o usuário.
 */
export async function startSession(userId: string): Promise<void> {
  if (sessions.has(userId)) {
    logger.info({ userId }, "WhatsApp session already active");
    return;
  }

  // Garante que existe registro na tabela
  await prisma.whatsAppSession.upsert({
    where: { userId },
    update: { status: WhatsAppStatus.CONNECTING },
    create: { userId, status: WhatsAppStatus.CONNECTING },
  });

  try {
    const { state, saveCreds } = await usePostgresAuthState(userId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: baileysLogger,
      printQRInTerminal: false,
      browser: ["Refidim", "Chrome", "1.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    // Handlers nomeados — armazenados pra podermos remover via .off() depois.
    // Auditoria 28/05: sem isso cada reconexão deixava 3 listeners orfãos no
    // EventEmitter do Baileys (em 24h com 50 reconnects = 150 closures vivos).
    const credsUpdateHandler = saveCreds as (...args: unknown[]) => unknown;

    const connectionUpdateHandler = async (update: Parameters<Parameters<typeof sock.ev.on>[1]>[0]): Promise<void> => {
      const { connection, lastDisconnect, qr } = update as {
        connection?: string;
        lastDisconnect?: { error?: unknown };
        qr?: string;
      };

      if (qr) {
        const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 1 });
        await prisma.whatsAppSession.update({
          where: { userId },
          data: { status: WhatsAppStatus.QR_PENDING, qrCode: dataUrl },
        });
        logger.info({ userId }, "📱 QR code gerado");
      }

      if (connection === "open") {
        const phoneNumber = sock.user?.id?.split(":")[0]?.split("@")[0];
        await prisma.whatsAppSession.update({
          where: { userId },
          data: {
            status: WhatsAppStatus.CONNECTED,
            qrCode: null,
            phoneNumber: phoneNumber ?? null,
            lastConnectedAt: new Date(),
          },
        });
        logger.info({ userId, phoneNumber }, "✅ WhatsApp conectado");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        const isReplaced = statusCode === DisconnectReason.connectionReplaced;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== DisconnectReason.badSession &&
          !isReplaced;

        // CRÍTICO: remover listeners ANTES de deletar a sessão. Sem isso os
        // 3 listeners ficam pendurados no sock.ev (que persiste em memória até GC).
        const existing = sessions.get(userId);
        if (existing) {
          unregisterSocketListeners(existing.socket, existing.handlers);
        }
        sessions.delete(userId);

        await prisma.whatsAppSession.update({
          where: { userId },
          data: {
            status:
              statusCode === DisconnectReason.loggedOut ||
              statusCode === DisconnectReason.badSession
                ? WhatsAppStatus.BANNED
                : WhatsAppStatus.DISCONNECTED,
            qrCode: null,
          },
        });

        logger.warn(
          { userId, statusCode, shouldReconnect, isReplaced },
          isReplaced
            ? "🚫 WhatsApp expulso por outro dispositivo (440) — aguardando ação manual"
            : "WhatsApp desconectado"
        );

        if (shouldReconnect) {
          setTimeout(() => {
            startSession(userId).catch((err) =>
              logger.error({ err, userId }, "Falha ao reconectar")
            );
          }, 5000);
        }
      }
    };

    const messagesUpsertHandler = async ({
      messages,
      type,
    }: {
      messages: unknown[];
      type: string;
    }): Promise<void> => {
      if (type !== "notify") return;
      for (const msg of messages) {
        try {
          await handleIncomingMessage(userId, sock, msg as never);
        } catch (err) {
          logger.error({ err, userId }, "Erro processando mensagem inbound");
        }
      }
    };

    const handlers: SessionHandlers = {
      credsUpdate: credsUpdateHandler,
      connectionUpdate: connectionUpdateHandler as (...args: unknown[]) => unknown,
      messagesUpsert: messagesUpsertHandler as (...args: unknown[]) => unknown,
    };

    sessions.set(userId, { socket: sock, userId, handlers });

    sock.ev.on("creds.update", handlers.credsUpdate);
    sock.ev.on("connection.update", handlers.connectionUpdate);
    sock.ev.on("messages.upsert", handlers.messagesUpsert);

    logger.info({ userId }, "WhatsApp session iniciada");
  } catch (err) {
    logger.error({ err, userId }, "Falha ao iniciar sessão WhatsApp");
    await prisma.whatsAppSession.update({
      where: { userId },
      data: { status: WhatsAppStatus.DISCONNECTED },
    });
    throw err;
  }
}

/**
 * Desconecta uma sessão (logout limpo) e limpa o auth state.
 */
export async function stopSession(userId: string, logout = false): Promise<void> {
  const session = sessions.get(userId);
  if (session) {
    // Remove listeners primeiro pra evitar disparos durante o logout/end
    // e pra garantir que listeners não vazem após sessão morrer.
    unregisterSocketListeners(session.socket, session.handlers);
    try {
      if (logout) {
        await session.socket.logout();
      } else {
        session.socket.end(undefined);
      }
    } catch (err) {
      logger.warn({ err, userId }, "Erro ao parar socket (ignorando)");
    }
    sessions.delete(userId);
  }

  await prisma.whatsAppSession.update({
    where: { userId },
    data: {
      status: WhatsAppStatus.DISCONNECTED,
      qrCode: null,
      // Prisma trata undefined como "skip" — usar DbNull pra realmente apagar
      ...(logout ? { authState: Prisma.DbNull, phoneNumber: null } : {}),
    },
  });

  logger.info({ userId, logout }, "WhatsApp session parada");
}

export function getActiveSocket(userId: string): WASocket | null {
  return sessions.get(userId)?.socket ?? null;
}

export function isSessionActive(userId: string): boolean {
  return sessions.has(userId);
}

/**
 * Envia uma mensagem de texto para um número (formato: 5511999999999@s.whatsapp.net ou só 5511999999999).
 */
export async function sendText(
  userId: string,
  to: string,
  text: string
): Promise<{ messageId?: string } | null> {
  const sock = getActiveSocket(userId);
  if (!sock) {
    logger.warn({ userId }, "Tentativa de enviar sem sessão ativa");
    return null;
  }

  const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
  const result = await sock.sendMessage(jid, { text });
  return { messageId: result?.key.id ?? undefined };
}

export async function shutdownAllSessions() {
  for (const userId of sessions.keys()) {
    await stopSession(userId, false);
  }
}
