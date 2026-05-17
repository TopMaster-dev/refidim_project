"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import {
  dedupeContacts,
  parseCsv,
  parsePastedText,
  type ParsedContact,
} from "@/lib/contacts";

type Result = { error?: string; ok?: boolean; listId?: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createListFromCsvAction(formData: FormData): Promise<Result> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");

  if (name.length < 2) return { error: "Dê um nome para a lista" };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Arquivo maior que 10 MB" };
  }

  const csvText = await file.text();
  const { contacts, skipped } = parseCsv(csvText);
  const deduped = dedupeContacts(contacts);

  if (deduped.length === 0) {
    return {
      error: `Nenhum contato válido encontrado. ${skipped} linha(s) ignoradas.`,
    };
  }

  const list = await createList(user.id, name, "CSV_UPLOAD", deduped);
  return { ok: true, listId: list.id };
}

export async function createListFromPasteAction(
  formData: FormData
): Promise<Result> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (name.length < 2) return { error: "Dê um nome para a lista" };
  if (text.length < 5) return { error: "Cole pelo menos 1 contato" };

  const contacts = parsePastedText(text);
  const deduped = dedupeContacts(contacts);

  if (deduped.length === 0) {
    return {
      error: "Não consegui identificar contatos no texto. Verifique o formato.",
    };
  }

  const list = await createList(user.id, name, "MANUAL_PASTE", deduped);
  return { ok: true, listId: list.id };
}

async function createList(
  userId: string,
  name: string,
  source: "CSV_UPLOAD" | "MANUAL_PASTE",
  contacts: ParsedContact[]
) {
  const list = await prisma.contactList.create({
    data: {
      userId,
      name,
      source,
      contacts: {
        createMany: {
          data: contacts.map((c) => ({
            name: c.name,
            company: c.company,
            phone: c.phone,
            email: c.email,
          })),
        },
      },
    },
  });

  revalidatePath("/painel/listas");
  return list;
}

export async function deleteListAction(listId: string) {
  const user = await requireUser();
  await prisma.contactList.deleteMany({
    where: { id: listId, userId: user.id },
  });
  revalidatePath("/painel/listas");
  redirect("/painel/listas");
}

export async function toggleContactOptOutAction(
  contactId: string,
  listId: string
) {
  const user = await requireUser();
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      contactList: { userId: user.id },
    },
  });
  if (!contact) return;
  await prisma.contact.update({
    where: { id: contactId },
    data: { isOptedOut: !contact.isOptedOut },
  });
  revalidatePath(`/painel/listas/${listId}`);
}
