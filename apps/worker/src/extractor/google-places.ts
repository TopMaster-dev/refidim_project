import {
  prisma,
  ContactListSource,
  ExtractionStatus,
} from "@refidim/database";
import { logger } from "../logger.js";

const POLL_INTERVAL_MS = 30_000;
const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Limites da Places API (New) v1
const PAGE_SIZE = 20; // máximo por requisição
const MAX_PAGES = 3; // total máximo = 60 resultados por query

let pollHandle: NodeJS.Timeout | null = null;
let running = false;

export function startExtractor() {
  if (pollHandle) return;
  logger.info("🌐 Extrator (Google Places API) iniciado");
  pollHandle = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Erro no extrator"));
  }, POLL_INTERVAL_MS);
  tick().catch((err) => logger.error({ err }, "Erro no tick inicial extrator"));
}

export function stopExtractor() {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick() {
  if (running) return;
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

interface PlacesResponse {
  places?: Array<{
    displayName?: { text?: string };
    formattedAddress?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    id?: string;
  }>;
  nextPageToken?: string;
}

interface ExtractedItem {
  name?: string;
  phone?: string;
  website?: string;
  address?: string;
  placeId?: string;
}

async function runExtraction(job: {
  id: string;
  userId: string;
  segment: string;
  city: string;
  desiredQuantity: number;
  resultListName: string;
}): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY não configurado — adicione no .env do worker"
    );
  }

  await prisma.extractionJob.update({
    where: { id: job.id },
    data: { status: ExtractionStatus.RUNNING },
  });

  const query = `${job.segment} em ${job.city}`;
  logger.info({ jobId: job.id, query }, "🌐 Buscando via Places API");

  const collected: ExtractedItem[] = [];
  const seen = new Set<string>(); // dedupe por placeId
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (collected.length >= job.desiredQuantity) break;

    const body: Record<string, unknown> = {
      textQuery: query,
      pageSize: PAGE_SIZE,
      languageCode: "pt-BR",
      regionCode: "BR",
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // FieldMask diz à API quais campos retornar — afeta cobrança
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,nextPageToken",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Places API HTTP ${response.status}: ${errText.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as PlacesResponse;
    const places = data.places ?? [];

    for (const p of places) {
      const placeId = p.id ?? "";
      if (placeId && seen.has(placeId)) continue;
      if (placeId) seen.add(placeId);

      collected.push({
        name: p.displayName?.text,
        phone: normalizePhoneE164(
          p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null
        ),
        website: p.websiteUri,
        address: p.formattedAddress,
        placeId,
      });

      if (collected.length >= job.desiredQuantity) break;
    }

    // Persiste contagem corrente pro frontend ver progresso
    await prisma.extractionJob.update({
      where: { id: job.id },
      data: { extractedCount: collected.length },
    });

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    // Per docs: aguardar antes de usar nextPageToken (token "ativa" após 1-2s)
    await sleep(2000);
  }

  // Corta no exato desiredQuantity (caso o último page retornou mais)
  const items = collected.slice(0, job.desiredQuantity);
  logger.info(
    { jobId: job.id, count: items.length, target: job.desiredQuantity },
    "🌐 Places API retornou"
  );

  // Filtra só contatos úteis (com phone OU website)
  const validContacts = items.filter((it) => it.phone || it.website);

  // Cria a ContactList
  const list = await prisma.contactList.create({
    data: {
      userId: job.userId,
      name: job.resultListName,
      source: ContactListSource.GOOGLE_EXTRACTION,
      contacts: {
        createMany: {
          data: validContacts.map((it) => ({
            name: it.name ?? null,
            phone: it.phone ?? null,
            metadata: {
              website: it.website ?? null,
              address: it.address ?? null,
              placeId: it.placeId ?? null,
              source: "google_places_api",
            },
          })),
        },
      },
    },
  });

  await prisma.extractionJob.update({
    where: { id: job.id },
    data: {
      status: ExtractionStatus.COMPLETED,
      extractedCount: validContacts.length,
      completedAt: new Date(),
    },
  });

  logger.info(
    {
      jobId: job.id,
      listId: list.id,
      total: items.length,
      saved: validContacts.length,
      filtered: items.length - validContacts.length,
    },
    "✅ Extração concluída"
  );
}

/**
 * Normaliza telefone pro formato E.164 (`+5511999998888`).
 * A Places API já retorna `internationalPhoneNumber` em formato bonitinho
 * (`+55 11 9999-8888`), só precisa tirar espaços e hífens.
 */
function normalizePhoneE164(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
