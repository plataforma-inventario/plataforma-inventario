import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import { LogisticaForm } from "./logistica-form";
import { UploadLogisticaReversaForm } from "./upload-form";
import { FiltroRelatorio, type ValoresFiltro } from "../filtro-relatorio";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Meta combinada com o usuário em 2026-09-04: 13 caixas por loja/mês.
const META_CAIXAS_POR_MES = 13;

export default async function LogisticaReversaPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltro>;
}) {
  const session = await auth();
  if (!session) return null;
  const podeGerenciar = session.user.perfil === "AUDITOR";
  const valores = await searchParams;

  const lojasParaCadastro = await getLojasVisiveis(session.user);
  const lojasFiltradas = valores.tipo
    ? lojasParaCadastro.filter((l) => l.tipoLoja === valores.tipo)
    : lojasParaCadastro;
  const lojaIds = (valores.loja ? lojasFiltradas.filter((l) => l.id === valores.loja) : lojasFiltradas).map(
    (l) => l.id
  );

  const registros = await prisma.logisticaReversa.findMany({
    where: {
      lojaId: { in: lojaIds },
      mesReferencia: valores.mes ? Number(valores.mes) : undefined,
      anoReferencia: valores.ano ? Number(valores.ano) : undefined,
    },
    include: { loja: true },
    orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
    take: 200,
  });

  const query = new URLSearchParams(
    Object.entries(valores).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Logística reversa</h1>
          <p className="text-sm text-neutral-500">Volume e valor enviado por loja e por mês.</p>
        </div>
        <a
          href={`/logistica-reversa/export${query ? `?${query}` : ""}`}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Exportar Excel
        </a>
      </div>

      <FiltroRelatorio lojas={lojasParaCadastro} valores={valores} />

      {podeGerenciar && (
        <div className="grid gap-3 sm:grid-cols-2">
          <UploadLogisticaReversaForm />
          <LogisticaForm lojas={lojasParaCadastro} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Período</th>
              <th className="px-4 py-2 font-medium">Volume (caixas)</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Meta ({META_CAIXAS_POR_MES} caixas)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {registros.map((r) => {
              const bateuMeta = r.volumeItens !== null && r.volumeItens >= META_CAIXAS_POR_MES;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-neutral-700">
                    {r.loja.pdv} — {r.loja.nome}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {MESES[r.mesReferencia - 1]}/{r.anoReferencia}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">
                    {r.volumeItens ?? "—"}
                    {r.arquivoOrigemId && <span className="ml-1 text-xs text-neutral-400">(auto)</span>}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(r.valorTotal))}</td>
                  <td className={`px-4 py-2 font-medium ${
                    r.volumeItens === null ? "text-neutral-400" : bateuMeta ? "text-emerald-700" : "text-red-600"
                  }`}>
                    {r.volumeItens === null ? "sem volume" : bateuMeta ? "Bateu" : "Não bateu"}
                  </td>
                </tr>
              );
            })}
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum registro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
