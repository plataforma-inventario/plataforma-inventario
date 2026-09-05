"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarGrupoCodigoEquivalente } from "./actions";

export function NovoGrupoForm() {
  const [state, formAction, pending] = useActionState(criarGrupoCodigoEquivalente, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.erro) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className="text-sm font-medium text-neutral-700">
          Descrição do produto
        </label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          placeholder='ex: "Loção 400ml Ameixa Negra"'
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="codigos" className="text-sm font-medium text-neutral-700">
          Códigos equivalentes (separados por vírgula)
        </label>
        <input
          id="codigos"
          name="codigos"
          type="text"
          placeholder="ex: 48281, 88082"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <p className="text-xs text-neutral-400">
          Pelo menos 2 códigos diferentes que sejam, na prática, o mesmo produto físico.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="observacao" className="text-sm font-medium text-neutral-700">
          Observação (opcional)
        </label>
        <input
          id="observacao"
          name="observacao"
          type="text"
          placeholder="ex: código legado substituído em 2024"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Cadastrar grupo"}
      </button>
    </form>
  );
}
