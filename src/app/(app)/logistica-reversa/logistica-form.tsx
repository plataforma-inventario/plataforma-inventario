"use client";

import { useActionState } from "react";
import { criarLogisticaReversa } from "./actions";

type LojaOpcao = { id: string; pdv: number; nome: string };

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function LogisticaForm({ lojas }: { lojas: LojaOpcao[] }) {
  const [state, formAction, pending] = useActionState(criarLogisticaReversa, undefined);
  const anoAtual = new Date().getFullYear();

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="lojaId" className="text-sm font-medium text-neutral-700">
            Loja
          </label>
          <select
            id="lojaId"
            name="lojaId"
            required
            defaultValue=""
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.pdv} — {l.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mesReferencia" className="text-sm font-medium text-neutral-700">
            Mês
          </label>
          <select
            id="mesReferencia"
            name="mesReferencia"
            required
            defaultValue={new Date().getMonth() + 1}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="anoReferencia" className="text-sm font-medium text-neutral-700">
            Ano
          </label>
          <input
            id="anoReferencia"
            name="anoReferencia"
            type="number"
            required
            defaultValue={anoAtual}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="volumeItens" className="text-sm font-medium text-neutral-700">
            Volume (itens)
          </label>
          <input
            id="volumeItens"
            name="volumeItens"
            type="number"
            min="0"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="valorTotal" className="text-sm font-medium text-neutral-700">
          Valor total (R$)
        </label>
        <input
          id="valorTotal"
          name="valorTotal"
          type="number"
          step="0.01"
          min="0"
          required
          className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Registrar"}
      </button>
    </form>
  );
}
