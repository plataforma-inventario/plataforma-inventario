"use client";

import { useActionState } from "react";
import type { Grupo, Regiao } from "@/generated/prisma/client";
import { LojaFields } from "../loja-fields";
import { atualizarLoja } from "../actions";

export function LojaEditForm({
  lojaId,
  grupos,
  regioes,
  loja,
}: {
  lojaId: string;
  grupos: Grupo[];
  regioes: Regiao[];
  loja: {
    pdv: number;
    nome: string;
    cnpj: string;
    tipoUnidade: string;
    tipoLoja: string;
    grupoId: string;
    regiaoId: string | null;
    cicloContagem: string | null;
    ativa: boolean;
  };
}) {
  const action = atualizarLoja.bind(null, lojaId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <LojaFields
        grupos={grupos}
        regioes={regioes}
        pdvEditavel={false}
        defaultValues={loja}
      />
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="ativa" defaultChecked={loja.ativa} />
        Loja ativa
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor="motivo" className="text-sm font-medium text-neutral-700">
          Motivo da alteração
        </label>
        <input
          id="motivo"
          name="motivo"
          type="text"
          required
          placeholder="ex: correção de cadastro, mudança de grupo gerencial..."
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <p className="text-xs text-neutral-400">
          Item 10.5: toda alteração fica registrada com o motivo, visível no histórico.
        </p>
      </div>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
