import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { ExtractorForm } from "./extractor-form";
import { ExtractionsList } from "./extractions-list";

export const dynamic = "force-dynamic";

export default async function ExtractorPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await prisma.extractionJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">Extrator</h1>
        <p className="mt-1 text-navy-600">
          Encontre leads no Google Maps por segmento e cidade. Os contatos públicos
          (telefone, site) viram uma lista pronta para usar em campanhas.
        </p>
      </header>

      <ExtractorForm />

      <ExtractionsList jobs={jobs} />
    </div>
  );
}
