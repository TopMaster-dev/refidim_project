import Link from "next/link";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  RUNNING: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Em execução",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
};

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
};

export default async function TrabalhosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      consultant: { select: { name: true } },
      contactList: { select: { name: true } },
      leads: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabalhos</h1>
          <p className="text-gray-600">
            {jobs.length} {jobs.length === 1 ? "campanha" : "campanhas"}
          </p>
        </div>
        <Button asChild>
          <Link href="/painel/trabalhos/novo">+ Novo trabalho</Link>
        </Button>
      </header>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Nenhum trabalho ainda
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Combine um consultor com uma lista para começar uma campanha.
          </p>
          <Button asChild className="mt-6">
            <Link href="/painel/trabalhos/novo">Criar primeiro trabalho</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {jobs.map((j) => {
            const cold = j.leads.filter((l) => l.status === "COLD").length;
            const warm = j.leads.filter((l) => l.status === "WARM").length;
            const hot = j.leads.filter((l) => l.status === "HOT").length;

            return (
              <Link
                key={j.id}
                href={`/painel/trabalhos/${j.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{j.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {j.consultant.name} → {j.contactList.name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[j.status]
                    }`}
                  >
                    {STATUS_LABELS[j.status]}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{CHANNEL_LABELS[j.channel]}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">
                    {j.leads.length} leads
                  </span>
                </div>

                <div className="mt-3 flex gap-2 text-xs">
                  <Pill label="Frios" value={cold} color="gray" />
                  <Pill label="Mornos" value={warm} color="yellow" />
                  <Pill label="Quentes" value={hot} color="red" />
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Criado em {formatDate(j.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "yellow" | "red";
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 ${colors[color]}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}
