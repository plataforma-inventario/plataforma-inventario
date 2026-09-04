import { auth } from "@/auth";
import { getTransferencias, getCiclosPorLoja } from "@/lib/relatorios";
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

  const [{ itens, totalEntrada, totalSaida }, lojas, ciclosPorLoja] = await Promise.all([
    getTransferencias(session.user, {
      lojaId: valores.loja,
      mes: valores.mes ? Number(valores.mes) : undefined,
      ano: valores.ano ? Number(valores.ano) : undefined,
      cicloId: valores.cicloId,
      dataInicio: valores.dataInicio ? new Date(`${valores.dataInicio}T00:00:00`) : undefined,
      dataFim: valores.dataFim ? new Date(`${valores.dataFim}T00:00:00`) : undefined,
      tipoLoja: valores.tipo as TipoLoja | undefined,
      direcao: valores.direcao as DirecaoMovimento | undefined,
    }),
    getLojasVisiveis(session.user),
    getCiclosPorLoja(session.user),
  ]);

  const query = new URLSearchParams(
    Object.entries(valores).filter(([, v]) => v) as [string, string][]
  ).toString();

  // Agrupa os itens (já corretos, sem valor de NF repetido) por documento,
  // pra mostrar quanto cada nota valeu no total e quais itens ela teve.
  const notasPorChave = new Map<
    string,
    {
      numeroDocumento: string;
      dataEmissao: Date;
      direcao: string;
      loja: (typeof itens)[number]["arquivo"]["ciclo"]["loja"];
      contraparteCodigo: string;
      contraparteNome: string;
      valorTotalNota: number;
      itens: typeof itens;
    }
  >();
  for (const i of itens) {
    const chave = `${i.arquivo.ciclo.loja.id}-${i.numeroDocumento}`;
    let nota = notasPorChave.get(chave);
    if (!nota) {
      nota = {
        numeroDocumento: i.numeroDocumento,
        dataEmissao: i.dataEmissao,
        direcao: i.direcao,
        loja: i.arquivo.ciclo.loja,
        contraparteCodigo: i.contraparteCodigo,
        contraparteNome: i.contraparteNome,
        valorTotalNota: 0,
        itens: [],
      };
      notasPorChave.set(chave, nota);
    }
    nota.valorTotalNota += Number(i.valorTotalItem);
    nota.itens.push(i);
  }
  const notas = Array.from(notasPorChave.values()).sort(
    (a, b) => b.dataEmissao.getTime() - a.dataEmissao.getTime()
  );

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

      <FiltroRelatorio lojas={lojas} valores={valores} mostrarDirecao ciclosPorLoja={ciclosPorLoja} />

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

      <div className="flex flex-col gap-3">
        {notas.map((nota) => (
          <div
            key={`${nota.loja.id}-${nota.numeroDocumento}`}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-neutral-900">NF {nota.numeroDocumento}</span>
                <span className="text-neutral-500">{nota.dataEmissao.toLocaleDateString("pt-BR")}</span>
                <span className="text-neutral-500">
                  {nota.loja.pdv} — {nota.loja.nome}
                </span>
                <span className={nota.direcao === "ENTRADA" ? "text-emerald-700" : "text-red-600"}>
                  {nota.direcao === "ENTRADA" ? "Entrada" : "Saída"}
                </span>
                <span className="text-neutral-500">
                  {nota.contraparteCodigo} — {nota.contraparteNome}
                </span>
              </div>
              <span className="text-sm font-medium text-neutral-900">
                {formatoBRL.format(nota.valorTotalNota)} · {nota.itens.length} item(ns)
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="px-4 py-1.5 font-normal">Produto</th>
                  <th className="px-4 py-1.5 font-normal">Qtde</th>
                  <th className="px-4 py-1.5 font-normal">Valor do item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {nota.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-1.5 text-neutral-700">{i.descricaoProduto}</td>
                    <td className="px-4 py-1.5 text-neutral-700">{i.quantidade.toString()}</td>
                    <td className="px-4 py-1.5 text-neutral-700">
                      {formatoBRL.format(Number(i.valorTotalItem))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {notas.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-400">
            Nenhuma transferência lançada ainda.
          </div>
        )}
      </div>
    </div>
  );
}
