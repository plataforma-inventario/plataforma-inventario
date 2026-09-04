import { auth } from "@/auth";
import { getAjustes, getCiclosPorLoja } from "@/lib/relatorios";
import { getLojasVisiveis } from "@/lib/access";
import { FiltroRelatorio, type ValoresFiltro } from "../filtro-relatorio";
import type { DirecaoMovimento, TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function AjustesPage({ searchParams }: { searchParams: Promise<ValoresFiltro> }) {
  const session = await auth();
  if (!session) return null;
  const valores = await searchParams;

  const [{ itens, totalEntrada, totalSaida }, lojas, ciclosPorLoja] = await Promise.all([
    getAjustes(session.user, {
      lojaId: valores.loja,
      mes: valores.mes ? Number(valores.mes) : undefined,
      ano: valores.ano ? Number(valores.ano) : undefined,
      cicloId: valores.cicloId,
      tipoLoja: valores.tipo as TipoLoja | undefined,
      direcao: valores.direcao as DirecaoMovimento | undefined,
    }),
    getLojasVisiveis(session.user),
    getCiclosPorLoja(session.user),
  ]);

  const query = new URLSearchParams(
    Object.entries(valores).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Ajustes de estoque</h1>
          <p className="text-sm text-neutral-500">
            Itens que entraram e saíram por ajuste (sem nota fiscal), por loja e período.
          </p>
        </div>
        <a
          href={`/ajustes/export${query ? `?${query}` : ""}`}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Exportar Excel
        </a>
      </div>

      <FiltroRelatorio lojas={lojas} valores={valores} mostrarDirecao ciclosPorLoja={ciclosPorLoja} />

      <div className="grid grid-cols-2 gap-3 sm:w-96">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total entrada</p>
          <p className="text-lg font-medium text-emerald-700">{formatoBRL.format(totalEntrada)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total saída</p>
          <p className="text-lg font-medium text-red-600">{formatoBRL.format(totalSaida)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Direção</th>
              <th className="px-4 py-2 font-medium">Produto</th>
              <th className="px-4 py-2 font-medium">Qtde</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {i.dataMovimento.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-700">
                  {i.arquivo.ciclo.loja.pdv} — {i.arquivo.ciclo.loja.nome}
                </td>
                <td className={`px-4 py-2 ${i.direcao === "ENTRADA" ? "text-emerald-700" : "text-red-600"}`}>
                  {i.direcao === "ENTRADA" ? "Entrada" : "Saída"}
                </td>
                <td className="px-4 py-2 text-neutral-900">{i.descricaoProduto}</td>
                <td className="px-4 py-2 text-neutral-700">{i.quantidade.toString()}</td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(i.valorTotalCusto))}</td>
                <td className="px-4 py-2 text-neutral-400">{i.observacao ?? "—"}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum ajuste lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
