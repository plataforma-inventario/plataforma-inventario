"use client";

import { useActionState } from "react";
import type { Grupo, Regiao } from "@/generated/prisma/client";
import { LojaFields } from "./loja-fields";
import { criarLoja } from "./actions";

export function LojaForm({ grupos, regioes }: { grupos: Grupo[]; regioes: Regiao[] }) {
  const [state, formAction, pending] = useActionState(criarLoja, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <LojaFields grupos={grupos} regioes={regioes} />
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Criar loja"}
      </button>
    </form>
  );
}
