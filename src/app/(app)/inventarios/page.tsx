import Link from "next/link";
import { auth } from "@/auth";
import { getInventarios } from "@/lib/relatorios";
import { getLojasVisiveis } from "@/lib/access";
import { FiltroRelatorio, type ValoresFiltro } from "../filtro-relatorio";
import type { TipoInventario, TipoLoja } from "@/generated/prisma/client";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

const ROTULO_CICLO: Record<string, string> = {
  MENSAL: "Mensal",
  BIMESTRAL: "Bimestral",
  TRIMESTRAL: "Trimestral",
};

export default async function InventariosPage({
  searchParams,
}: {
  searchParams: Promise<ValoresFiltro>;
}) {
  const session = await auth();
  if (!session) return null;
  const valores = await searchParams;

  const filtros = {
    lojaId: valores.loja,
    mes: valores.mes ? Number(valores.mes) : undefined,
    ano: valores.ano ? Number(valores.ano) : undefined,
    tipoLoja: valores.tipo as TipoLoja | undefined,
    tipoInventario: valores.tipoInventario as TipoInventario | undefined,
  };

  const [linhas, lojas] = await Promise.all([
    getInventarios(session.user, filtros),
    getLojasVisiveis(session.user),
  ]);

  const query = new URLSearchParams(
    Object.entries(valores).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Inventários</h1>
          <p className="text-sm text-neutral-500">
            Todos os lançamentos fechados, cruzando todas as lojas.
          </p>
        </div>
        <a
          href={`/inventarios/export${query ? `?${query}` : ""}`}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Exportar Excel
        </a>
      </div>

      <FiltroRelatorio lojas={lojas} valores={valores} mostrarTipoInventario />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Região</th>
              <th className="px-4 py-2 font-medium">Tipo loja</th>
              <th className="px-4 py-2 font-medium">Ciclo</th>
              <th className="px-4 py-2 font-medium">Inventário</th>
              <th className="px-4 py-2 font-medium">Divergência R$</th>
              <th className="px-4 py-2 font-medium">% estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {linhas.map((l) => (
              <tr key={l.cicloId}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {l.dataFim.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  <Link href={`/lojas/${l.lojaId}`} className="hover:text-brand-dark hover:underline">
                    {l.pdv} — {l.nomeLoja}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-500">{l.regiaoNome ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-500">{l.tipoLoja}</td>
                <td className="px-4 py-2 text-neutral-500">
                  {l.cicloContagem ? ROTULO_CICLO[l.cicloContagem] : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  {l.tipoInventario === "COMPLETO" ? "Completo" : "Cíclico"}
                </td>
                <td className={`px-4 py-2 ${l.divergenciaValor < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatoBRL.format(l.divergenciaValor)}
                </td>
                <td className="px-4 py-2 font-medium text-neutral-900">
                  {l.percentualSobreEstoque !== null ? formatoPct(l.percentualSobreEstoque) : "—"}
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum inventário fechado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
