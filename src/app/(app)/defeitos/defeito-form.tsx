"use client";

import { useActionState } from "react";
import { criarDefeito } from "./actions";

type LojaOpcao = { id: string; pdv: number; nome: string };

export function DefeitoForm({ lojas }: { lojas: LojaOpcao[] }) {
  const [state, formAction, pending] = useActionState(criarDefeito, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
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
          <label htmlFor="numeroNotaFiscal" className="text-sm font-medium text-neutral-700">
            Número da nota fiscal
          </label>
          <input
            id="numeroNotaFiscal"
            name="numeroNotaFiscal"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="dataEnvio" className="text-sm font-medium text-neutral-700">
            Data de envio
          </label>
          <input
            id="dataEnvio"
            name="dataEnvio"
            type="date"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="valorEnviado" className="text-sm font-medium text-neutral-700">
            Valor enviado (R$)
          </label>
          <input
            id="valorEnviado"
            name="valorEnviado"
            type="number"
            step="0.01"
            min="0"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="descricaoItens" className="text-sm font-medium text-neutral-700">
          Itens (opcional)
        </label>
        <textarea
          id="descricaoItens"
          name="descricaoItens"
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Registrar defeito"}
      </button>
    </form>
  );
}
