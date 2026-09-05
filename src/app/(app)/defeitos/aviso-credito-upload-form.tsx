"use client";

import { useActionState } from "react";
import { uploadAvisoCredito } from "./actions";

type LojaOpcao = { id: string; pdv: number; nome: string };

export function AvisoCreditoUploadForm({ lojas }: { lojas: LojaOpcao[] }) {
  const [state, formAction, pending] = useActionState(uploadAvisoCredito, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">Aviso de Crédito (PDF)</p>
        <p className="text-xs text-neutral-400">
          Cruza automaticamente com os Defeitos já lançados pelo número da NF, preenchendo o
          reembolso (valor, data e status) sozinho.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="arquivo"
          required
          accept=".pdf"
          className="flex-1 text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-200"
        />
        <select
          name="lojaId"
          defaultValue=""
          title="Opcional — restringe a busca a essa loja, garantindo que não cruze com outra loja por engano"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Cruzar em todas as lojas</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.pdv} — {l.nome}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      {state?.aviso && <p className="text-sm text-amber-600">{state.aviso}</p>}
    </form>
  );
}
