"use client";

import { useTransition } from "react";
import { salvarVisitaAgendada } from "./actions";

export function DataLojaInput({
  lojaId,
  ano,
  mes,
  dataAtual,
}: {
  lojaId: string;
  ano: number;
  mes: number;
  dataAtual: string; // "yyyy-mm-dd" ou ""
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="date"
      defaultValue={dataAtual}
      disabled={pending}
      onChange={(e) => {
        const valor = e.target.value;
        startTransition(() => {
          salvarVisitaAgendada(lojaId, ano, mes, valor);
        });
      }}
      className="rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500 disabled:opacity-50"
    />
  );
}
