"use client";

import { useActionState } from "react";
import { criarInsucesso } from "./actions";

type LojaOpcao = { id: string; pdv: number; nome: string };

export function InsucessoForm({ lojas }: { lojas: LojaOpcao[] }) {
  const [state, formAction, pending] = useActionState(criarInsucesso, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ins-loja" className="text-sm font-medium text-neutral-700">
            Loja
          </label>
          <select
            id="ins-loja"
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
          <label htmlFor="ins-data" className="text-sm font-medium text-neutral-700">
            Data
          </label>
          <input
            id="ins-data"
            name="data"
            type="date"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ins-nf" className="text-sm font-medium text-neutral-700">
            NF (opcional)
          </label>
          <input
            id="ins-nf"
            name="numeroNotaFiscal"
            type="text"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ins-obs" className="text-sm font-medium text-neutral-700">
          Observação
        </label>
        <input
          id="ins-obs"
          name="observacao"
          type="text"
          required
          placeholder="ex: NF de defeito 1856 parada em loja"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ins-foto" className="text-sm font-medium text-neutral-700">
          Foto da caixa (opcional)
        </label>
        <input
          id="ins-foto"
          name="foto"
          type="file"
          accept="image/*"
          className="text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-200"
        />
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Registrar insucesso"}
      </button>
    </form>
  );
}
