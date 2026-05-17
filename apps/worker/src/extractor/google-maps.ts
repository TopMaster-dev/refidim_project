import { chromium, type Browser, type Page } from "playwright";
import {
  prisma,
  ContactListSource,
  ExtractionStatus,
} from "@refidim/database";
import { logger } from "../logger.js";

const POLL_INTERVAL_MS = 30_000;

let pollHandle: NodeJS.Timeout | null = null;
let running = false;

export function startExtractor() {
  if (pollHandle) return;
  logger.info("🌐 Extrator iniciado");
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no extrator"));
  }, POLL_INTERVAL_MS);
  // Tick imediato
  tick().catch((err) => logger.error({ err }, "Erro no tick inicial extrator"));
}

export function stopExtractor() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  if (running) return; // só 1 extração por vez
  const job = await prisma.extractionJob.findFirst({
    where: { status: ExtractionStatus.QUEUED },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return;

  running = true;
  try {
    await runExtraction(job);
  } catch (err) {
    logger.error({ err, jobId: job.id }, "Extração falhou");
    await prisma.extractionJob.update({
      where: { id: job.id },
      data: {
        status: ExtractionStatus.FAILED,
        errorMessage: (err as Error).message.slice(0, 500),
        completedAt: new Date(),
      },
    });
  } finally {
    running = false;
  }
}

interface ExtractedItem {
  name?: string;
  phone?: string;
  website?: string;
  address?: string;
}

async function runExtraction(job: {
  id: string;
  userId: string;
  segment: string;
  city: string;
  desiredQuantity: number;
  resultListName: string;
}) {
  await prisma.extractionJob.update({
    where: { id: job.id },
    data: { status: ExtractionStatus.RUNNING },
  });

  logger.info({ jobId: job.id, query: `${job.segment} em ${job.city}` }, "🌐 Iniciando extração");

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      locale: "pt-BR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    const query = `${job.segment} em ${job.city}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Aceita cookies se aparecer
    await page.waitForTimeout(2000);
    try {
      await page.click('button:has-text("Aceitar tudo")', { timeout: 3000 });
    } catch {
      // ignora
    }

    // Espera a lista carregar
    const listSelector = 'div[role="feed"]';
    await page.waitForSelector(listSelector, { timeout: 30_000 });

    // Scrolla até atingir a quantidade desejada ou esgotar resultados
    const extracted = new Map<string, ExtractedItem>();
    let lastCount = 0;
    let unchanged = 0;

    while (extracted.size < job.desiredQuantity && unchanged < 5) {
      const items = await collectVisibleResults(page);
      for (const it of items) {
        const key = it.phone ?? it.website ?? it.name ?? "";
        if (!key || extracted.has(key)) continue;
        extracted.set(key, it);
        if (extracted.size >= job.desiredQuantity) break;
      }

      // Persiste contagem corrente
      await prisma.extractionJob.update({
        where: { id: job.id },
        data: { extractedCount: extracted.size },
      });

      if (extracted.size === lastCount) {
        unchanged++;
      } else {
        unchanged = 0;
        lastCount = extracted.size;
      }

      // Scrolla
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollTop = el.scrollHeight;
      }, listSelector);
      await page.waitForTimeout(1500);
    }

    const items = Array.from(extracted.values());
    logger.info({ jobId: job.id, count: items.length }, "🌐 Extração coletou");

    // Cria a ContactList
    const list = await prisma.contactList.create({
      data: {
        userId: job.userId,
        name: job.resultListName,
        source: ContactListSource.GOOGLE_EXTRACTION,
        contacts: {
          createMany: {
            data: items
              .filter((it) => it.phone || it.website)
              .map((it) => ({
                name: it.name,
                phone: it.phone ? normalizePhoneE164(it.phone) : null,
                metadata: { website: it.website, address: it.address, source: "google_maps" },
              })),
          },
        },
      },
    });

    await prisma.extractionJob.update({
      where: { id: job.id },
      data: {
        status: ExtractionStatus.COMPLETED,
        extractedCount: items.length,
        completedAt: new Date(),
      },
    });

    logger.info({ jobId: job.id, listId: list.id, count: items.length }, "✅ Extração concluída");
  } finally {
    if (browser) await browser.close();
  }
}

async function collectVisibleResults(page: Page): Promise<ExtractedItem[]> {
  return page.evaluate(() => {
    const cards = document.querySelectorAll<HTMLAnchorElement>('a.hfpxzc');
    const results: Array<{
      name?: string;
      phone?: string;
      website?: string;
      address?: string;
    }> = [];

    cards.forEach((card) => {
      const container = card.closest("[jslog]") as HTMLElement | null;
      if (!container) return;

      const name = card.getAttribute("aria-label") ?? undefined;

      // Telefone aparece em divs com classes que mudam — busca por padrão
      const textNodes = Array.from(container.querySelectorAll<HTMLDivElement>("div"));
      let phone: string | undefined;
      let address: string | undefined;
      for (const t of textNodes) {
        const text = (t.textContent ?? "").trim();
        if (!phone) {
          const m = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
          if (m && m[1] && /\d{8,}/.test(m[1].replace(/\D/g, ""))) phone = m[1];
        }
        if (!address && /,\s*\d/.test(text) && text.length < 200) {
          address = text;
        }
      }

      // Website: link com host externo
      const links = container.querySelectorAll<HTMLAnchorElement>('a[data-value="Site"]');
      const website = links[0]?.href;

      if (name || phone) {
        results.push({ name, phone, website, address });
      }
    });

    return results;
  });
}

function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Brasil: se começa com 55, é E.164. Senão prefixa.
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}
