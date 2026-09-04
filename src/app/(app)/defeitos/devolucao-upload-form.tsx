"use client";

import { useActionState } from "react";
import { uploadDevolucao } from "./actions";

export function DevolucaoUploadForm() {
  const [state, formAction, pending] = useActionState(uploadDevolucao, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">Relatório de devoluções (NF)</p>
        <p className="text-xs text-neutral-400">
          CSV — cria uma nota por documento, com os itens detalhados (não soma o valor da NF
          várias vezes).
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          name="arquivo"
          required
          accept=".csv"
          className="flex-1 text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-200"
        />
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
