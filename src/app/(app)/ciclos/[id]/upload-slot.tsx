"use client";

import { useActionState } from "react";
import type { CategoriaArquivo } from "@/generated/prisma/client";
import { uploadArquivo, removerArquivo } from "./actions";

type ArquivoExistente = {
  id: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  createdAt: string;
};

export function UploadSlot({
  cicloId,
  categoria,
  label,
  formatoEsperado,
  podeGerenciar,
  arquivo,
}: {
  cicloId: string;
  categoria: CategoriaArquivo;
  label: string;
  formatoEsperado: string;
  podeGerenciar: boolean;
  arquivo: ArquivoExistente | null;
}) {
  const action = uploadArquivo.bind(null, cicloId, categoria);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-400">{formatoEsperado}</p>
        </div>
        {arquivo && <span className="text-emerald-700 text-sm">✓ enviado</span>}
      </div>

      {arquivo ? (
        <div className="mt-3 flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
          <span className="truncate text-neutral-700">
            {arquivo.nomeArquivo} ({(arquivo.tamanhoBytes / 1024).toFixed(0)} KB)
          </span>
          {podeGerenciar && (
            <form action={removerArquivo.bind(null, cicloId, arquivo.id)}>
              <button className="ml-3 shrink-0 text-neutral-400 hover:text-red-600">
                remover
              </button>
            </form>
          )}
        </div>
      ) : podeGerenciar ? (
        <form action={formAction} className="mt-3 flex items-center gap-2">
          <input
            type="file"
            name="arquivo"
            required
            className="flex-1 text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-200"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">Ainda não enviado.</p>
      )}

      {state?.erro && <p className="mt-2 text-sm text-red-600">{state.erro}</p>}
    </div>
  );
}
