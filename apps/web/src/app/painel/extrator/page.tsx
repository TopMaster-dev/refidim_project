import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Extrator Google"
        description="Encontre leads no Google Maps por segmento e cidade. Contatos públicos viram lista pronta."
      />

      <ExtractorForm />
      <ExtractionsList jobs={jobs} />
    </div>
  );
}
