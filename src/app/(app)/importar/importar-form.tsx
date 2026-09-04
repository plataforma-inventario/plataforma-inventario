"use client";

import { useActionState } from "react";
import { importarArquivos } from "./actions";

const COR_STATUS: Record<string, string> = {
  OK: "text-emerald-700",
  AVISO: "text-amber-600",
  ERRO: "text-red-600",
};

const ICONE_STATUS: Record<string, string> = {
  OK: "✓",
  AVISO: "⚠",
  ERRO: "✗",
};

export function ImportarForm() {
  const [state, formAction, pending] = useActionState(importarArquivos, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <p className="text-sm font-medium text-neutral-900">Arraste ou selecione os arquivos</p>
          <p className="text-xs text-neutral-500">
            Pode selecionar vários de uma vez, de tipos diferentes (inventário, transferências,
            ajuste, faturamento, devolução...). O sistema identifica sozinho o que é cada um e
            joga na loja/lançamento certo — a Requisição precisa ser enviada pela tela do
            lançamento da loja, porque o relatório dela não identifica o PDV.
          </p>
        </div>
        <input
          type="file"
          name="arquivos"
          multiple
          required
          accept=".csv,.pdf,.xls,.xlsx"
          className="text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-200"
        />
        {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Processando..." : "Importar"}
        </button>
      </form>

      {state?.resultados && state.resultados.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Resultado</h2>
          <ul className="flex flex-col gap-1">
            {state.resultados.map((r, i) => (
              <li
                key={i}
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              >
                <span className={`mr-2 ${COR_STATUS[r.status]}`}>{ICONE_STATUS[r.status]}</span>
                <strong className="text-neutral-900">{r.nomeArquivo}</strong>
                <span className="text-neutral-500"> — {r.mensagem}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
