"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type LojaOpcao = { id: string; pdv: number; nome: string };
export type CicloOpcao = { id: string; lojaId: string; dataInicio: string; dataFim: string };

export type ValoresFiltro = {
  loja?: string;
  mes?: string;
  ano?: string;
  tipo?: string;
  direcao?: string;
  tipoInventario?: string;
  cicloId?: string;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatoCurto(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function FiltroRelatorio({
  lojas,
  valores,
  mostrarDirecao,
  mostrarTipoInventario,
  mostrarBusca,
  ciclosPorLoja,
}: {
  lojas: LojaOpcao[];
  valores: ValoresFiltro;
  mostrarDirecao?: boolean;
  mostrarTipoInventario?: boolean;
  /** Mostra um campo de busca livre (nome ou CPF) - usado em Premiações. */
  mostrarBusca?: boolean;
  /** Quando presente, mostra o select "Período (ciclo)" — lista os ciclos da loja selecionada. */
  ciclosPorLoja?: CicloOpcao[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const irPara = (novosValores: ValoresFiltro) => {
    const params = new URLSearchParams();
    for (const [chave, v] of Object.entries(novosValores)) {
      if (v) params.set(chave, v);
    }
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  };

  const atualizar = (campo: keyof ValoresFiltro, valor: string) => {
    irPara({ ...valores, [campo]: valor });
  };

  // Campo de texto livre: espera uma pausa na digitação antes de navegar,
  // pra não recarregar a página a cada letra digitada.
  const [busca, setBusca] = useState(valores.busca ?? "");
  useEffect(() => setBusca(valores.busca ?? ""), [valores.busca]);
  useEffect(() => {
    if (busca === (valores.busca ?? "")) return;
    const timer = setTimeout(() => atualizar("busca", busca), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const ciclosDaLoja = (ciclosPorLoja ?? []).filter((c) => c.lojaId === valores.loja);

  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1];

  return (
    <div className="flex flex-wrap gap-2">
      {mostrarBusca && (
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF..."
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
      )}

      <select
        value={valores.loja ?? ""}
        onChange={(e) => irPara({ ...valores, loja: e.target.value, cicloId: "" })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value="">Todas as lojas</option>
        {lojas.map((l) => (
          <option key={l.id} value={l.id}>
            {l.pdv} — {l.nome}
          </option>
        ))}
      </select>

      {ciclosPorLoja && (
        <select
          value={valores.cicloId ?? ""}
          disabled={!valores.loja}
          onChange={(e) =>
            irPara({ ...valores, cicloId: e.target.value, mes: "", ano: "", dataInicio: "", dataFim: "" })
          }
          title={!valores.loja ? "Selecione uma loja primeiro" : undefined}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400"
        >
          <option value="">
            {valores.loja ? "Qualquer período" : "Selecione uma loja"}
          </option>
          {ciclosDaLoja.map((c) => (
            <option key={c.id} value={c.id}>
              {formatoCurto(c.dataInicio)} a {formatoCurto(c.dataFim)}
            </option>
          ))}
        </select>
      )}

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
        onChange={(e) =>
          irPara({ ...valores, mes: e.target.value, cicloId: "", dataInicio: "", dataFim: "" })
        }
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
        onChange={(e) =>
          irPara({ ...valores, ano: e.target.value, cicloId: "", dataInicio: "", dataFim: "" })
        }
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
        <label htmlFor="filtro-data-inicio" className="text-xs text-neutral-500">
          De
        </label>
        <input
          id="filtro-data-inicio"
          type="date"
          value={valores.dataInicio ?? ""}
          onChange={(e) =>
            irPara({ ...valores, dataInicio: e.target.value, mes: "", ano: "", cicloId: "" })
          }
          className="text-sm outline-none"
        />
        <label htmlFor="filtro-data-fim" className="text-xs text-neutral-500">
          até
        </label>
        <input
          id="filtro-data-fim"
          type="date"
          value={valores.dataFim ?? ""}
          onChange={(e) =>
            irPara({ ...valores, dataFim: e.target.value, mes: "", ano: "", cicloId: "" })
          }
          className="text-sm outline-none"
        />
      </div>

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
