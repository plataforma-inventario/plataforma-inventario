"use client";

import { useTransition } from "react";
import { classificarTipoDevolucao } from "./actions";
import type { TipoDevolucao } from "@/generated/prisma/client";

export function ClassificarTipo({
  defeitoId,
  tipoDevolucao,
}: {
  defeitoId: string;
  tipoDevolucao: TipoDevolucao | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={tipoDevolucao ?? ""}
      disabled={pending}
      onChange={(e) => {
        const valor = e.target.value as TipoDevolucao;
        startTransition(() => {
          classificarTipoDevolucao(defeitoId, valor);
        });
      }}
      className="rounded border border-neutral-300 px-1 py-1 text-xs"
    >
      <option value="" disabled>
        Classificar...
      </option>
      <option value="DEFEITO">Defeito</option>
      <option value="FALTA_MERCADORIA">Falta de mercadoria</option>
    </select>
  );
}
