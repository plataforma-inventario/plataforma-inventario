import { auth } from "@/auth";
import { getRequisicoes, getCiclosPorLoja } from "@/lib/relatorios";
import { getLojasVisiveis } from "@/lib/access";
import { FiltroRelatorio, type ValoresFiltro } from "../filtro-relatorio";
import type { TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltro>;
}) {
  const session = await auth();
  if (!session) return null;
  const valores = await searchParams;

  const [{ itens, custoTotal }, lojas, ciclosPorLoja] = await Promise.all([
    getRequisicoes(session.user, {
      lojaId: valores.loja,
      mes: valores.mes ? Number(valores.mes) : undefined,
      ano: valores.ano ? Number(valores.ano) : undefined,
      cicloId: valores.cicloId,
      dataInicio: valores.dataInicio ? new Date(`${valores.dataInicio}T00:00:00`) : undefined,
      dataFim: valores.dataFim ? new Date(`${valores.dataFim}T00:00:00`) : undefined,
      tipoLoja: valores.tipo as TipoLoja | undefined,
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
          <h1 className="text-lg font-medium text-brand-dark">Requisições</h1>
          <p className="text-sm text-neutral-500">
            Demonstradores, brindes, vencidos, premiações, perda/roubo e material auxiliar.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href="/requisicoes/premiacoes"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Premiações
          </a>
          <a
            href="/requisicoes/comparativo"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Comparar lojas
          </a>
          <a
            href={`/requisicoes/export${query ? `?${query}` : ""}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Exportar Excel
          </a>
        </div>
      </div>

      <FiltroRelatorio lojas={lojas} valores={valores} ciclosPorLoja={ciclosPorLoja} />

      <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:w-64">
        <p className="text-sm text-neutral-500">Custo total</p>
        <p className="text-lg font-medium text-neutral-900">{formatoBRL.format(custoTotal)}</p>
      </div>

      {/* Item 6: nunca exibir PDV aqui — só a razão social. */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Razão social</th>
              <th className="px-4 py-2 font-medium">Motivo</th>
              <th className="px-4 py-2 font-medium">Produto</th>
              <th className="px-4 py-2 font-medium">Qtde</th>
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
                  {i.arquivo.ciclo.loja.grupo.razaoSocial ?? i.arquivo.ciclo.loja.grupo.nome}
                </td>
                <td className="px-4 py-2 text-neutral-700">{i.motivoCodigo}</td>
                <td className="px-4 py-2 text-neutral-900">{i.descricaoProduto}</td>
                <td className="px-4 py-2 text-neutral-700">{i.quantidadeAtendida.toString()}</td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(i.custoTotal))}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Nenhuma requisição lançada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
