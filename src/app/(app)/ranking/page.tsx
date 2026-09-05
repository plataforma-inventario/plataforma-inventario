import Link from "next/link";
import { auth } from "@/auth";
import { getRankingLojas } from "@/lib/ranking";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

const ROTULO_TENDENCIA: Record<string, string> = {
  MELHOROU: "↓ melhorou",
  PIOROU: "↑ piorou",
  ESTAVEL: "≈ estável",
  SEM_HISTORICO: "—",
};

const COR_TENDENCIA: Record<string, string> = {
  MELHOROU: "text-emerald-700",
  PIOROU: "text-red-600",
  ESTAVEL: "text-neutral-500",
  SEM_HISTORICO: "text-neutral-400",
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ ordenarPor?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { ordenarPor } = await searchParams;
  const criterio = ordenarPor === "valor" ? "valor" : "percentual";

  const linhas = await getRankingLojas(session.user, criterio);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Ranking entre lojas</h1>
          <p className="text-sm text-neutral-500">
            Divergência do lançamento fechado mais recente de cada loja, ordenado do pior para o
            melhor.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`/ranking/export?ordenarPor=${criterio}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Exportar Excel
          </a>
          <a
            href={`/ranking/export-pdf?ordenarPor=${criterio}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Exportar PDF
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm">
        <span className="text-neutral-500">Ordenar por:</span>
        <Link
          href="/ranking?ordenarPor=percentual"
          className={`rounded-md px-3 py-1 ${
            criterio === "percentual"
              ? "bg-brand-dark text-white"
              : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          % sobre faturamento
        </Link>
        <Link
          href="/ranking?ordenarPor=valor"
          className={`rounded-md px-3 py-1 ${
            criterio === "valor"
              ? "bg-brand-dark text-white"
              : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          Valor (R$)
        </Link>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nenhuma loja com lançamento fechado ainda para comparar.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Loja</th>
                <th className="px-4 py-2 font-medium">Região</th>
                <th className="px-4 py-2 font-medium">Último lançamento</th>
                <th className="px-4 py-2 font-medium">Divergência R$</th>
                <th className="px-4 py-2 font-medium">% faturamento</th>
                <th className="px-4 py-2 font-medium">Meta</th>
                <th className="px-4 py-2 font-medium">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {linhas.map((l, i) => (
                <tr key={l.lojaId} className={l.acimaDaMeta ? "bg-red-50" : undefined}>
                  <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link href={`/lojas/${l.lojaId}`} className="text-neutral-900 hover:text-brand-dark hover:underline">
                      {l.pdv} — {l.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{l.regiaoNome ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/ciclos/${l.cicloId}`} className="hover:text-brand-dark hover:underline">
                      {l.dataFim.toLocaleDateString("pt-BR")}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-900">
                    {formatoBRL.format(l.divergenciaValor)}{" "}
                    <span className="text-xs text-neutral-400">
                      ({l.divergenciaValor < 0 ? "falta" : "sobra"})
                    </span>
                  </td>
                  <td className={`px-4 py-2 font-medium ${l.acimaDaMeta ? "text-red-600" : "text-neutral-900"}`}>
                    {l.percentualSobreFaturamento !== null ? formatoPct(l.percentualSobreFaturamento) : "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {l.metaPercentual !== null ? formatoPct(l.metaPercentual) : "sem meta"}
                  </td>
                  <td className={`px-4 py-2 ${COR_TENDENCIA[l.tendencia]}`}>
                    {ROTULO_TENDENCIA[l.tendencia]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
