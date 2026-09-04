import type { PontoHistoricoDivergencia } from "@/lib/divergencia";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

export function HistoricoDivergencia({ pontos }: { pontos: PontoHistoricoDivergencia[] }) {
  if (pontos.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Nenhum lançamento fechado com inventário lido ainda — o gráfico aparece a partir do
        primeiro.
      </p>
    );
  }

  const comPercentual = pontos.filter((p) => p.percentualSobreEstoque !== null);
  const maiorPct = Math.max(...comPercentual.map((p) => p.percentualSobreEstoque!), 0.01);
  const melhor = comPercentual.reduce((a, b) =>
    (a.percentualSobreEstoque ?? Infinity) <= (b.percentualSobreEstoque ?? Infinity) ? a : b
  , comPercentual[0]);
  const pior = comPercentual.reduce((a, b) =>
    (a.percentualSobreEstoque ?? -Infinity) >= (b.percentualSobreEstoque ?? -Infinity) ? a : b
  , comPercentual[0]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4" style={{ height: 160 }}>
        {pontos.map((p) => {
          const alturaPct = p.percentualSobreEstoque !== null ? (p.percentualSobreEstoque / maiorPct) * 100 : 2;
          return (
            <div key={p.cicloId} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
              <span className="text-[10px] text-neutral-400">
                {p.percentualSobreEstoque !== null ? formatoPct(p.percentualSobreEstoque) : "—"}
              </span>
              <div
                title={`${p.dataFim.toLocaleDateString("pt-BR")} — ${p.tipoInventario === "COMPLETO" ? "Completo" : "Cíclico"}`}
                className={`w-full rounded-t ${p.tipoInventario === "COMPLETO" ? "bg-amber-400" : "bg-neutral-700"}`}
                style={{ height: `${Math.max(alturaPct, 3)}%`, minHeight: 2 }}
              />
              <span className="text-[10px] whitespace-nowrap text-neutral-400">
                {p.dataFim.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-neutral-700" /> Cíclico
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> Completo (evento pontual/motivado)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-96">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">Melhor inventário</p>
          <p className="text-sm font-medium text-emerald-800">
            {melhor.dataFim.toLocaleDateString("pt-BR")} —{" "}
            {melhor.percentualSobreEstoque !== null ? formatoPct(melhor.percentualSobreEstoque) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">Pior inventário</p>
          <p className="text-sm font-medium text-red-800">
            {pior.dataFim.toLocaleDateString("pt-BR")} —{" "}
            {pior.percentualSobreEstoque !== null ? formatoPct(pior.percentualSobreEstoque) : "—"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Divergência R$</th>
              <th className="px-4 py-2 font-medium">% estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {[...pontos].reverse().map((p) => (
              <tr key={p.cicloId}>
                <td className="px-4 py-2 text-neutral-500">{p.dataFim.toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 text-neutral-700">
                  {p.tipoInventario === "COMPLETO" ? "Completo" : "Cíclico"}
                </td>
                <td className={`px-4 py-2 ${p.divergenciaValor < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatoBRL.format(p.divergenciaValor)}
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  {p.percentualSobreEstoque !== null ? formatoPct(p.percentualSobreEstoque) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
