import { auth } from "@/auth";
import { getTransferencias } from "@/lib/relatorios";
import { getLojasVisiveis } from "@/lib/access";
import { FiltroRelatorio, type ValoresFiltro } from "../filtro-relatorio";
import type { DirecaoMovimento, TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltro>;
}) {
  const session = await auth();
  if (!session) return null;
  const valores = await searchParams;

  const [{ itens, totalEntrada, totalSaida }, lojas] = await Promise.all([
    getTransferencias(session.user, {
      lojaId: valores.loja,
      mes: valores.mes ? Number(valores.mes) : undefined,
      ano: valores.ano ? Number(valores.ano) : undefined,
      tipoLoja: valores.tipo as TipoLoja | undefined,
      direcao: valores.direcao as DirecaoMovimento | undefined,
    }),
    getLojasVisiveis(session.user),
  ]);

  const query = new URLSearchParams(
    Object.entries(valores).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Transferências</h1>
          <p className="text-sm text-neutral-500">
            Documentos fiscais de saída e entrada entre lojas do mesmo CNPJ.
          </p>
        </div>
        <a
          href={`/transferencias/export${query ? `?${query}` : ""}`}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Exportar Excel
        </a>
      </div>

      <FiltroRelatorio lojas={lojas} valores={valores} mostrarDirecao />

      <div className="grid grid-cols-2 gap-3 sm:w-96">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total entrada</p>
          <p className="text-lg font-medium text-emerald-700">{formatoBRL.format(totalEntrada)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Total saída</p>
          <p className="text-lg font-medium text-neutral-900">{formatoBRL.format(totalSaida)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Direção</th>
              <th className="px-4 py-2 font-medium">Documento</th>
              <th className="px-4 py-2 font-medium">Contraparte</th>
              <th className="px-4 py-2 font-medium">Produto</th>
              <th className="px-4 py-2 font-medium">Qtde</th>
              <th className="px-4 py-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {i.dataEmissao.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-700">
                  {i.arquivo.ciclo.loja.pdv} — {i.arquivo.ciclo.loja.nome}
                </td>
                <td className={`px-4 py-2 ${i.direcao === "ENTRADA" ? "text-emerald-700" : "text-red-600"}`}>
                  {i.direcao === "ENTRADA" ? "Entrada" : "Saída"}
                </td>
                <td className="px-4 py-2 text-neutral-500">{i.numeroDocumento}</td>
                <td className="px-4 py-2 text-neutral-700">
                  {i.contraparteCodigo} — {i.contraparteNome}
                </td>
                <td className="px-4 py-2 text-neutral-900">{i.descricaoProduto}</td>
                <td className="px-4 py-2 text-neutral-700">{i.quantidade.toString()}</td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(i.valorTotalItem))}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  Nenhuma transferência lançada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
