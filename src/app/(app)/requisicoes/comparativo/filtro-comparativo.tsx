"use client";

import { useRouter, usePathname } from "next/navigation";

export type ValoresFiltroComparativo = {
  tipo?: string;
  mes?: string;
  ano?: string;
  dataInicio?: string;
  dataFim?: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FiltroComparativo({ valores }: { valores: ValoresFiltroComparativo }) {
  const router = useRouter();
  const pathname = usePathname();

  const irPara = (novosValores: ValoresFiltroComparativo) => {
    const params = new URLSearchParams();
    for (const [chave, v] of Object.entries(novosValores)) {
      if (v) params.set(chave, v);
    }
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  };

  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1];

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={valores.tipo ?? ""}
        onChange={(e) => irPara({ ...valores, tipo: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todos os tipos</option>
        <option value="VAREJO">Varejo</option>
        <option value="REVENDA">Revenda</option>
        <option value="LOGISTICA">Logística</option>
      </select>

      <select
        value={valores.mes ?? ""}
        onChange={(e) => irPara({ ...valores, mes: e.target.value, dataInicio: "", dataFim: "" })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todos os meses</option>
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={valores.ano ?? ""}
        onChange={(e) => irPara({ ...valores, ano: e.target.value, dataInicio: "", dataFim: "" })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todos os anos</option>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1">
        <label htmlFor="comp-data-inicio" className="text-xs text-neutral-500">
          De
        </label>
        <input
          id="comp-data-inicio"
          type="date"
          value={valores.dataInicio ?? ""}
          onChange={(e) => irPara({ ...valores, dataInicio: e.target.value, mes: "", ano: "" })}
          className="text-sm outline-none"
        />
        <label htmlFor="comp-data-fim" className="text-xs text-neutral-500">
          até
        </label>
        <input
          id="comp-data-fim"
          type="date"
          value={valores.dataFim ?? ""}
          onChange={(e) => irPara({ ...valores, dataFim: e.target.value, mes: "", ano: "" })}
          className="text-sm outline-none"
        />
      </div>
    </div>
  );
}
