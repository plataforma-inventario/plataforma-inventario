import Link from "next/link";
import { auth } from "@/auth";
import { getPremiacoes, getCiclosPorLoja } from "@/lib/relatorios";
import { getLojasVisiveis } from "@/lib/access";
import { FiltroRelatorio, type ValoresFiltro } from "../../filtro-relatorio";
import type { TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PremiacoesPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltro>;
}) {
  const session = await auth();
  if (!session) return null;
  const valores = await searchParams;

  const [{ itens }, lojas, ciclosPorLoja] = await Promise.all([
    getPremiacoes(session.user, {
      lojaId: valores.loja,
      mes: valores.mes ? Number(valores.mes) : undefined,
      ano: valores.ano ? Number(valores.ano) : undefined,
      cicloId: valores.cicloId,
      dataInicio: valores.dataInicio ? new Date(`${valores.dataInicio}T00:00:00`) : undefined,
      dataFim: valores.dataFim ? new Date(`${valores.dataFim}T00:00:00`) : undefined,
      tipoLoja: valores.tipo as TipoLoja | undefined,
      busca: valores.busca,
    }),
    getLojasVisiveis(session.user),
    getCiclosPorLoja(session.user),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/requisicoes" className="text-sm text-neutral-500 hover:text-brand-dark hover:underline">
          ← Requisições
        </Link>
        <h1 className="text-lg font-medium text-brand-dark">Premiações</h1>
        <p className="text-sm text-neutral-500">
          Item escolhido por cada funcionária na premiação, com a observação (nome/CPF) da
          requisição — busque pelo CPF (ou nome) da funcionária, ou filtre por loja e período.
        </p>
      </div>

      <FiltroRelatorio lojas={lojas} valores={valores} ciclosPorLoja={ciclosPorLoja} mostrarBusca />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Funcionária (observação)</th>
              <th className="px-4 py-2 font-medium">Item escolhido</th>
              <th className="px-4 py-2 font-medium">Custo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {i.dataRequisicao.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  <Link
                    href={`/lojas/${i.arquivo.ciclo.loja.id}`}
                    className="hover:text-brand-dark hover:underline"
                  >
                    {i.arquivo.ciclo.loja.pdv} — {i.arquivo.ciclo.loja.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-900">{i.observacao ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-700">
                  {i.codigoProduto} — {i.descricaoProduto}
                </td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(i.custoTotal))}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Nenhuma premiação lançada ainda no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
