import { parsePhoneNumberFromString } from "libphonenumber-js";
import Papa from "papaparse";

export interface ParsedContact {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

const HEADER_ALIASES: Record<string, keyof ParsedContact> = {
  nome: "name",
  name: "name",
  contato: "name",
  empresa: "company",
  company: "company",
  organização: "company",
  organizacao: "company",
  telefone: "phone",
  celular: "phone",
  whatsapp: "phone",
  phone: "phone",
  fone: "phone",
  email: "email",
  "e-mail": "email",
  mail: "email",
};

function normalizeHeader(h: string): keyof ParsedContact | null {
  const key = h.trim().toLowerCase().replace(/[^a-zçãáéíóúâêôà ]/g, "");
  return HEADER_ALIASES[key] ?? null;
}

export function normalizePhone(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return undefined;
  // Default BR se não tiver código de país
  const candidate = cleaned.startsWith("+") ? cleaned : `+55${cleaned}`;
  const parsed = parsePhoneNumberFromString(candidate, "BR");
  if (!parsed || !parsed.isValid()) return undefined;
  return parsed.number; // E.164
}

export function normalizeEmail(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Parse a CSV string into contacts. Recognizes Portuguese and English headers.
 * Returns parsed contacts (normalized) plus stats.
 */
export function parseCsv(csvText: string): {
  contacts: ParsedContact[];
  totalRows: number;
  skipped: number;
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const mapping = new Map<string, keyof ParsedContact>();
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm) mapping.set(h, norm);
  }

  const contacts: ParsedContact[] = [];
  let skipped = 0;

  for (const row of result.data) {
    const c: ParsedContact = {};
    for (const [csvKey, field] of mapping.entries()) {
      const value = row[csvKey]?.trim();
      if (!value) continue;
      if (field === "phone") c.phone = normalizePhone(value);
      else if (field === "email") c.email = normalizeEmail(value);
      else c[field] = value;
    }
    if (!c.phone && !c.email) {
      skipped++;
      continue;
    }
    contacts.push(c);
  }

  return { contacts, totalRows: result.data.length, skipped };
}

/**
 * Parse free-text pasted by the user. Each line is one contact.
 * Heuristic: split by comma/tab/semicolon. Try to detect phone/email by pattern.
 */
export function parsePastedText(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    const parts = line.split(/[,\t;|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const c: ParsedContact = {};
    for (const part of parts) {
      if (!c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
        c.email = part.toLowerCase();
      } else if (!c.phone && /[\d]{8,}/.test(part)) {
        const norm = normalizePhone(part);
        if (norm) c.phone = norm;
      } else if (!c.name) {
        c.name = part;
      } else if (!c.company) {
        c.company = part;
      }
    }

    if (c.phone || c.email) contacts.push(c);
  }

  return contacts;
}

/**
 * Dedupe by phone first, then email. Keeps first occurrence.
 */
export function dedupeContacts(contacts: ParsedContact[]): ParsedContact[] {
  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();
  const out: ParsedContact[] = [];
  for (const c of contacts) {
    if (c.phone && seenPhone.has(c.phone)) continue;
    if (c.email && seenEmail.has(c.email)) continue;
    if (c.phone) seenPhone.add(c.phone);
    if (c.email) seenEmail.add(c.email);
    out.push(c);
  }
  return out;
}
