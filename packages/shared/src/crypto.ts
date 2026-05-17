import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY ou NEXTAUTH_SECRET deve estar definido para criptografar credenciais");
  }
  return createHash("sha256").update(raw).digest();
}

/**
 * Criptografa um plaintext em formato "iv:authTag:ciphertext" (todos base64).
 * Usa AES-256-GCM com chave derivada de NEXTAUTH_SECRET.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/**
 * Descriptografa o formato "iv:authTag:ciphertext".
 * Lança erro se o auth tag não bater (tampering ou chave errada).
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Payload criptografado inválido");
  const [ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64!, "base64");
  const authTag = Buffer.from(tagB64!, "base64");
  const ciphertext = Buffer.from(ctB64!, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
