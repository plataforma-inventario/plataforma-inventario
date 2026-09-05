import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import { getEstatisticasInsucesso } from "@/lib/insucesso";
import { DevolucaoUploadForm } from "./devolucao-upload-form";
import { AvisoCreditoUploadForm } from "./aviso-credito-upload-form";
import { InsucessoForm } from "./insucesso-form";
import { ClassificarTipo } from "./classificar-tipo";
import { FiltroDefeitos } from "./filtro-defeitos";
import { atualizarReembolso } from "./actions";
import type { TipoDevolucao } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  INTEGRAL: "Integral",
};
const COR_STATUS: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PARCIAL: "bg-blue-50 text-blue-700",
  INTEGRAL: "bg-emerald-50 text-emerald-700",
};
const ROTULO_TIPO: Record<string, string> = {
  DEFEITO: "Defeito",
  FALTA_MERCADORIA: "Falta de mercadoria",
};

export default async function DefeitosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; tipo?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const podeGerenciar = session.user.perfil === "AUDITOR";
  const { loja: lojaFiltro, tipo: tipoFiltro } = await searchParams;

  const lojas = await getLojasVisiveis(session.user);
  const lojaIds = lojas.map((l) => l.id);

  const defeitos = await prisma.defeito.findMany({
    where: {
      lojaId: lojaFiltro ? lojaFiltro : { in: lojaIds },
      tipoDevolucao: (tipoFiltro as TipoDevolucao) || undefined,
    },
    include: { loja: true, itens: true },
    orderBy: { dataEnvio: "desc" },
    take: 200,
  });

  const recebidos = defeitos.filter((d) => d.dataRecebimentoReembolso);
  const tempoMedioDias =
    recebidos.length > 0
      ? Math.round(
          recebidos.reduce(
            (acc, d) =>
              acc +
              (d.dataRecebimentoReembolso!.getTime() - d.dataEnvio.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / recebidos.length
        )
      : null;

  const totalPorTipo = {
    DEFEITO: defeitos.filter((d) => d.tipoDevolucao === "DEFEITO").reduce((a, d) => a + Number(d.valorEnviado), 0),
    FALTA_MERCADORIA: defeitos
      .filter((d) => d.tipoDevolucao === "FALTA_MERCADORIA")
      .reduce((a, d) => a + Number(d.valorEnviado), 0),
    SEM_CLASSIFICAR: defeitos
      .filter((d) => !d.tipoDevolucao)
      .reduce((a, d) => a + Number(d.valorEnviado), 0),
  };

  const estatisticasInsucesso = await getEstatisticasInsucesso(lojaIds);
  const insucessosRecentes = await prisma.insucesso.findMany({
    where: { lojaId: { in: lojaIds } },
    include: { loja: true },
    orderBy: { data: "desc" },
    take: 20,
  });

  const query = new URLSearchParams(
    Object.entries({ loja: lojaFiltro, tipo: tipoFiltro }).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Defeitos</h1>
          <p className="text-sm text-neutral-500">
            Notas fiscais de devolução (defeito e falta de mercadoria) e status do reembolso.
          </p>
        </div>
        <a
          href={`/defeitos/export${query ? `?${query}` : ""}`}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Exportar Excel
        </a>
      </div>

      <FiltroDefeitos lojas={lojas} loja={lojaFiltro} tipo={tipoFiltro} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Tempo médio de reembolso</p>
          <p className="text-lg font-medium text-neutral-900">
            {tempoMedioDias !== null ? `${tempoMedioDias} dias` : "sem dados"}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Enviado — Defeito</p>
          <p className="text-lg font-medium text-neutral-900">{formatoBRL.format(totalPorTipo.DEFEITO)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">Enviado — Falta de mercadoria</p>
          <p className="text-lg font-medium text-neutral-900">
            {formatoBRL.format(totalPorTipo.FALTA_MERCADORIA)}
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-500">Sem classificar</p>
          <p className="text-lg font-medium text-neutral-900">{formatoBRL.format(totalPorTipo.SEM_CLASSIFICAR)}</p>
        </div>
      </div>

      {podeGerenciar && (
        <div className="grid gap-3 sm:grid-cols-2">
          <DevolucaoUploadForm />
          <AvisoCreditoUploadForm lojas={lojas} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">NF</th>
              <th className="px-4 py-2 font-medium">Fornecedor</th>
              <th className="px-4 py-2 font-medium">Envio</th>
              <th className="px-4 py-2 font-medium">Enviado</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Reembolsado</th>
              {podeGerenciar && <th className="px-4 py-2 font-medium">Atualizar</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {defeitos.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-700">
                  {d.loja.pdv} — {d.loja.nome}
                </td>
                <td className="px-4 py-2 text-neutral-500">{d.numeroNotaFiscal}</td>
                <td className="px-4 py-2 text-neutral-500">{d.fornecedorNome ?? "—"}</td>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {d.dataEnvio.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(d.valorEnviado))}</td>
                <td className="px-4 py-2">
                  {podeGerenciar ? (
                    <ClassificarTipo defeitoId={d.id} tipoDevolucao={d.tipoDevolucao} />
                  ) : (
                    <span className="text-neutral-500">
                      {d.tipoDevolucao ? ROTULO_TIPO[d.tipoDevolucao] : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {d.itens.length > 0 ? (
                    <details>
                      <summary className="cursor-pointer">{d.itens.length} item(ns)</summary>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {d.itens.map((i) => (
                          <li key={i.id}>
                            {i.codigoProduto} — {i.descricaoProduto} (qtd {i.quantidade.toString()},{" "}
                            {formatoBRL.format(Number(i.valorTotalItem))})
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    d.descricaoItens ?? "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[d.statusReembolso]}`}>
                    {ROTULO_STATUS[d.statusReembolso]}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  {formatoBRL.format(Number(d.valorReembolsado))}
                </td>
                {podeGerenciar && (
                  <td className="px-4 py-2">
                    <form
                      action={atualizarReembolso.bind(null, d.id)}
                      className="flex flex-wrap items-center gap-1"
                    >
                      <select
                        name="statusReembolso"
                        defaultValue={d.statusReembolso}
                        className="rounded border border-neutral-300 px-1 py-1 text-xs"
                      >
                        <option value="PENDENTE">Pendente</option>
                        <option value="PARCIAL">Parcial</option>
                        <option value="INTEGRAL">Integral</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        name="valorReembolsado"
                        defaultValue={d.valorReembolsado.toString()}
                        className="w-20 rounded border border-neutral-300 px-1 py-1 text-xs"
                      />
                      <input
                        type="date"
                        name="dataRecebimentoReembolso"
                        defaultValue={d.dataRecebimentoReembolso?.toISOString().slice(0, 10) ?? ""}
                        className="rounded border border-neutral-300 px-1 py-1 text-xs"
                      />
                      <input type="hidden" name="motivo" value="Atualização de status de reembolso" />
                      <button className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100">
                        Salvar
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {defeitos.length === 0 && (
              <tr>
                <td colSpan={podeGerenciar ? 10 : 9} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum defeito registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium text-neutral-900">Insucesso</h2>
          <p className="text-sm text-neutral-500">
            Caixa/NF de defeito que ficou parada na loja e o processo não foi concluído.
          </p>
        </div>

        {podeGerenciar && <InsucessoForm lojas={lojas} />}

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Loja</th>
                <th className="px-4 py-2 font-medium">Total de insucessos</th>
                <th className="px-4 py-2 font-medium">Último insucesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {estatisticasInsucesso.map((e) => (
                <tr key={e.lojaId} className={e.totalInsucessos === 0 ? "bg-emerald-50" : undefined}>
                  <td className="px-4 py-2 text-neutral-700">
                    {e.pdv} — {e.nome}
                  </td>
                  <td className={`px-4 py-2 font-medium ${e.totalInsucessos > 2 ? "text-red-600" : "text-neutral-900"}`}>
                    {e.totalInsucessos}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {e.ultimoInsucesso ? e.ultimoInsucesso.toLocaleDateString("pt-BR") : "nunca teve"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col gap-1">
          {insucessosRecentes.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                <span className="text-neutral-400">{i.data.toLocaleDateString("pt-BR")}</span> —{" "}
                {i.loja.pdv} — {i.loja.nome}
                {i.numeroNotaFiscal ? ` (NF ${i.numeroNotaFiscal})` : ""}: {i.observacao}
              </span>
              {i.fotoCaixa && (
                <a
                  href={`/defeitos/insucesso/${i.id}/foto`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-neutral-500 hover:text-brand-dark hover:underline"
                >
                  ver foto
                </a>
              )}
            </li>
          ))}
          {insucessosRecentes.length === 0 && (
            <li className="text-sm text-neutral-400">Nenhum insucesso registrado ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
