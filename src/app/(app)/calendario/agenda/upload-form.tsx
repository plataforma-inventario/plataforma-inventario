"use client";

import { useActionState } from "react";
import { uploadImagemAgenda } from "./actions";

export function UploadImagemAgendaForm({ ano, mes }: { ano: number; mes: number }) {
  const [state, formAction, pending] = useActionState(uploadImagemAgenda, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="ano" value={ano} />
      <input type="hidden" name="mes" value={mes} />
      <div className="flex flex-col gap-1">
        <label htmlFor="agenda-arquivo" className="text-sm font-medium text-neutral-700">
          Print do Google Agenda (mês selecionado)
        </label>
        <input
          id="agenda-arquivo"
          name="arquivo"
          type="file"
          accept="image/*"
          required
          className="text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar imagem"}
      </button>
      {state?.erro && <p className="w-full text-sm text-red-600">{state.erro}</p>}
    </form>
  );
}
