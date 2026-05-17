import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@refidim/database";
import { getCurrentUser } from "@/lib/auth";
import { TrabalhoControls } from "./trabalho-controls";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Em execução",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  RUNNING: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default async function TrabalhoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      consultant: true,
      contactList: { include: { _count: { select: { contacts: true } } } },
      leads: { select: { status: true } },
    },
  });
  if (!job) notFound();

  const cold = job.leads.filter((l) => l.status === "COLD").length;
  const warm = job.leads.filter((l) => l.status === "WARM").length;
  const hot = job.leads.filter((l) => l.status === "HOT").length;
  const handed = job.leads.filter((l) => l.status === "HANDED_OFF").length;
  const opted = job.leads.filter((l) => l.status === "OPTED_OUT").length;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/painel/trabalhos"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Trabalhos
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
            <p className="mt-1 text-gray-600">
              <Link
                href={`/painel/consultores/${job.consultant.id}`}
                className="hover:underline"
              >
                {job.consultant.name}
              </Link>{" "}
              →{" "}
              <Link
                href={`/painel/listas/${job.contactList.id}`}
                className="hover:underline"
              >
                {job.contactList.name}
              </Link>{" "}
              ({job.contactList._count.contacts} contatos)
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              STATUS_STYLES[job.status]
            }`}
          >
            {STATUS_LABELS[job.status]}
          </span>
        </div>
      </header>

      <TrabalhoControls jobId={job.id} status={job.status} />

      <div className="grid grid-cols-5 gap-4">
        <Stat label="Frios" value={cold} accent="gray" />
        <Stat label="Mornos" value={warm} accent="yellow" />
        <Stat label="Quentes" value={hot} accent="red" />
        <Stat label="Assumidos" value={handed} accent="blue" />
        <Stat label="Opt-out" value={opted} accent="gray" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Configuração</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <Detail label="Canal" value={job.channel === "WHATSAPP" ? "WhatsApp" : "E-mail"} />
          <Detail label="Limite diário" value={`${job.dailyLimit} envios/dia`} />
          <Detail
            label="Iniciado"
            value={job.startedAt ? formatDate(job.startedAt) : "—"}
          />
          <Detail
            label="Pausado"
            value={job.pausedAt ? formatDate(job.pausedAt) : "—"}
          />
        </dl>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "gray" | "yellow" | "red" | "blue";
}) {
  const colors = {
    gray: "border-gray-200",
    yellow: "border-yellow-300",
    red: "border-red-300",
    blue: "border-blue-300",
  };
  return (
    <div className={`rounded-lg border-l-4 ${colors[accent]} bg-white p-4`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
