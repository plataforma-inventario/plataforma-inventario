import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getComparativoFaturamentoRequisicao } from "@/lib/comparativo";
import { FiltroComparativo, type ValoresFiltroComparativo } from "./filtro-comparativo";
import type { TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

export default async function ComparativoRequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltroComparativo>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil === "GERENTE_VAREJO" || session.user.perfil === "GERENTE_REVENDA") {
    redirect("/");
  }

  const valores = await searchParams;

  const linhas = await getComparativoFaturamentoRequisicao(session.user, {
    mes: valores.mes ? Number(valores.mes) : undefined,
    ano: valores.ano ? Number(valores.ano) : undefined,
    dataInicio: valores.dataInicio ? new Date(`${valores.dataInicio}T00:00:00`) : undefined,
    dataFim: valores.dataFim ? new Date(`${valores.dataFim}T00:00:00`) : undefined,
    tipoLoja: valores.tipo as TipoLoja | undefined,
  });

  const comPercentual = linhas.filter((l) => l.percentualSobreFaturamento !== null);
  const mediaPercentual =
    comPercentual.length > 0
      ? comPercentual.reduce((acc, l) => acc + l.percentualSobreFaturamento!, 0) / comPercentual.length
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/requisicoes" className="text-sm text-neutral-500 hover:text-brand-dark hover:underline">
          ← Requisições
        </Link>
        <h1 className="text-lg font-medium text-brand-dark">Comparativo: faturamento x requisições</h1>
        <p className="text-sm text-neutral-500">
          Ordenado por faturamento — lojas próximas na lista têm faturamento parecido, então dá
          pra comparar se a requisição de cada uma é proporcional. Linhas destacadas estão bem
          acima da média do grupo.
        </p>
      </div>

      <FiltroComparativo valores={valores} />

      {mediaPercentual !== null && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:w-64">
          <p className="text-sm text-neutral-500">Média do grupo (requisição/faturamento)</p>
          <p className="text-lg font-medium text-neutral-900">{formatoPct(mediaPercentual)}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Faturamento</th>
              <th className="px-4 py-2 font-medium">Requisição (R$)</th>
              <th className="px-4 py-2 font-medium">% sobre faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {linhas.map((l) => {
              const acimaDaMedia =
                mediaPercentual !== null &&
                l.percentualSobreFaturamento !== null &&
                l.percentualSobreFaturamento > mediaPercentual * 1.5;
              return (
                <tr key={l.loja.id} className={acimaDaMedia ? "bg-red-50" : undefined}>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/lojas/${l.loja.id}`} className="hover:text-brand-dark hover:underline">
                      {l.loja.pdv} — {l.loja.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{l.loja.tipoLoja}</td>
                  <td className="px-4 py-2 text-neutral-700">
                    {l.faturamento > 0 ? formatoBRL.format(l.faturamento) : "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(l.requisicaoTotal)}</td>
                  <td className={`px-4 py-2 font-medium ${acimaDaMedia ? "text-red-600" : "text-neutral-900"}`}>
                    {l.percentualSobreFaturamento !== null ? formatoPct(l.percentualSobreFaturamento) : "sem faturamento"}
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Nenhuma loja com faturamento ou requisição no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
