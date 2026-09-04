"use client";

import { useRouter, usePathname } from "next/navigation";

type LojaOpcao = { id: string; pdv: number; nome: string };

export type ValoresFiltro = {
  loja?: string;
  mes?: string;
  ano?: string;
  tipo?: string;
  direcao?: string;
  tipoInventario?: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FiltroRelatorio({
  lojas,
  valores,
  mostrarDirecao,
  mostrarTipoInventario,
}: {
  lojas: LojaOpcao[];
  valores: ValoresFiltro;
  mostrarDirecao?: boolean;
  mostrarTipoInventario?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const atualizar = (campo: keyof ValoresFiltro, valor: string) => {
    const params = new URLSearchParams();
    const novosValores = { ...valores, [campo]: valor };
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
        value={valores.loja ?? ""}
        onChange={(e) => atualizar("loja", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todas as lojas</option>
        {lojas.map((l) => (
          <option key={l.id} value={l.id}>
            {l.pdv} — {l.nome}
          </option>
        ))}
      </select>

      <select
        value={valores.tipo ?? ""}
        onChange={(e) => atualizar("tipo", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todos os tipos</option>
        <option value="VAREJO">Varejo</option>
        <option value="REVENDA">Revenda</option>
        <option value="LOGISTICA">Logística</option>
      </select>

      <select
        value={valores.mes ?? ""}
        onChange={(e) => atualizar("mes", e.target.value)}
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
        onChange={(e) => atualizar("ano", e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todos os anos</option>
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {mostrarDirecao && (
        <select
          value={valores.direcao ?? ""}
          onChange={(e) => atualizar("direcao", e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Entrada e saída</option>
          <option value="ENTRADA">Só entrada</option>
          <option value="SAIDA">Só saída</option>
        </select>
      )}

      {mostrarTipoInventario && (
        <select
          value={valores.tipoInventario ?? ""}
          onChange={(e) => atualizar("tipoInventario", e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Cíclico e completo</option>
          <option value="CICLICO">Só cíclico</option>
          <option value="COMPLETO">Só completo</option>
        </select>
      )}
    </div>
  );
}
