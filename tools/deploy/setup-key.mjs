import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import ssh2 from "ssh2";

dotenv.config({ path: join(process.cwd(), "..", "..", ".env") });

const HOST = "62.171.147.247";
const PORT = 22;
const USERNAME = "root";
const PASSWORD = process.env.SSH_ROOT_PASSWORD;

if (!PASSWORD) {
  console.error("SSH_ROOT_PASSWORD não encontrado no .env");
  process.exit(1);
}

const pubKey = readFileSync(join(homedir(), ".ssh", "id_ed25519.pub"), "utf8").trim();
console.log("Chave local:", pubKey.slice(0, 40) + "...");

const conn = new ssh2.Client();

function run(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => resolve({ code, stdout, stderr }))
        .on("data", (d) => (stdout += d.toString()))
        .stderr.on("data", (d) => (stderr += d.toString()));
    });
  });
}

conn
  .on("ready", async () => {
    console.log("Conectado ao servidor.");
    try {
      // Run commands
      const os = await run("cat /etc/os-release | head -3");
      console.log("OS:\n" + os.stdout);

      await run("mkdir -p ~/.ssh && chmod 700 ~/.ssh");
      // Append key only if missing (idempotent)
      const escaped = pubKey.replace(/'/g, "'\\''");
      await run(`grep -qxF '${escaped}' ~/.ssh/authorized_keys 2>/dev/null || echo '${escaped}' >> ~/.ssh/authorized_keys`);
      await run("chmod 600 ~/.ssh/authorized_keys");
      const verify = await run("wc -l ~/.ssh/authorized_keys");
      console.log("authorized_keys:", verify.stdout.trim());
      console.log("✅ Chave copiada. SSH por chave habilitado.");
    } catch (err) {
      console.error("Erro:", err.message);
    } finally {
      conn.end();
    }
  })
  .on("error", (err) => {
    console.error("Falha de conexão:", err.message);
    process.exit(1);
  })
  .connect({
    host: HOST,
    port: PORT,
    username: USERNAME,
    password: PASSWORD,
    readyTimeout: 15000,
  });
