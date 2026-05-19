/**
 * Teste isolado de credenciais SMTP Gmail.
 *
 * Uso:
 *   pnpm --filter @refidim/worker exec tsx scripts/test-smtp.ts <email> <app-password>
 *
 * Ex:
 *   pnpm --filter @refidim/worker exec tsx scripts/test-smtp.ts suporterefidim@gmail.com "abcd efgh ijkl mnop"
 */

import nodemailer from "nodemailer";

const [, , emailArg, passArg] = process.argv;

if (!emailArg || !passArg) {
  console.error("Uso: tsx scripts/test-smtp.ts <email> <app-password>");
  process.exit(1);
}

const email = emailArg.trim();
const passwordRaw = passArg;
const passwordTrimmed = passwordRaw.trim();
const passwordNoSpaces = passwordTrimmed.replace(/\s+/g, "");

console.log("\n🔎 Diagnóstico SMTP Gmail\n");
console.log(`Email:                ${email}`);
console.log(`Senha (raw length):   ${passwordRaw.length}`);
console.log(`Senha (trimmed len):  ${passwordTrimmed.length}`);
console.log(`Senha (sem espaços):  ${passwordNoSpaces.length} chars (esperado: 16)`);
console.log(`Primeiros 4 chars:    "${passwordNoSpaces.slice(0, 4)}"`);
console.log(`Últimos 4 chars:      "${passwordNoSpaces.slice(-4)}"`);

if (passwordNoSpaces.length !== 16) {
  console.error("\n❌ A senha de app do Gmail tem EXATAMENTE 16 caracteres (sem contar espaços).");
  console.error("   Você passou", passwordNoSpaces.length, "chars. Verifique se copiou correto.");
}

async function testWith(label: string, password: string) {
  console.log(`\n— Testando com ${label}...`);
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: email, pass: password },
    connectionTimeout: 15_000,
  });
  try {
    await transporter.verify();
    console.log(`  ✅ AUTENTICOU com sucesso usando: ${label}`);
    return true;
  } catch (err) {
    console.log(`  ❌ Falhou: ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  const ok1 = await testWith("senha como digitada (com espaços, se houver)", passwordTrimmed);
  if (ok1) return;
  const ok2 = await testWith("senha SEM espaços", passwordNoSpaces);
  if (ok2) {
    console.log("\n💡 A senha funciona SEM os espaços. Cole no painel sem espaços.");
    return;
  }

  console.log("\n❌ Nenhuma variação autenticou.\n");
  console.log("Próximos passos:");
  console.log("  1. Vá em https://myaccount.google.com/apppasswords");
  console.log("  2. **Revogue** qualquer senha de app antiga chamada 'Refidim'");
  console.log("  3. Gere uma NOVA");
  console.log("  4. Rode este script novamente com a senha nova\n");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
