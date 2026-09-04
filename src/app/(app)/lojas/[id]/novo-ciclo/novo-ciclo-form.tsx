"use client";

import { useActionState, useState } from "react";
import { criarCiclo } from "./actions";

export function NovoCicloForm({ lojaId, dataInicio }: { lojaId: string; dataInicio: string }) {
  const action = criarCiclo.bind(null, lojaId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [tipo, setTipo] = useState<"CICLICO" | "COMPLETO">("CICLICO");
  const [motivo, setMotivo] = useState("");

  const dataInicioFmt = new Date(dataInicio).toLocaleDateString("pt-BR");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
        Período detectado automaticamente: desde <strong>{dataInicioFmt}</strong> (fim do
        último lançamento fechado desta loja) até a data que você informar abaixo.
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dataFim" className="text-sm font-medium text-neutral-700">
          Data do inventário
        </label>
        <input
          id="dataFim"
          name="dataFim"
          type="date"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tipoInventario" className="text-sm font-medium text-neutral-700">
          Tipo de inventário
        </label>
        <select
          id="tipoInventario"
          name="tipoInventario"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "CICLICO" | "COMPLETO")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="CICLICO">Cíclico (setor/curva do ciclo normal)</option>
          <option value="COMPLETO">Completo (loja inteira)</option>
        </select>
      </div>

      {tipo === "COMPLETO" && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="motivoCompleto" className="text-sm font-medium text-neutral-700">
              Motivo do inventário completo
            </label>
            <select
              id="motivoCompleto"
              name="motivoCompleto"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            >
              <option value="" disabled>
                Selecione
              </option>
              <option value="SUSPEITA_ROUBO">Suspeita / diagnóstico de roubo</option>
              <option value="POS_NATAL_JANEIRO">Inventário anual pós-Natal (janeiro)</option>
              <option value="OUTRO">Outro motivo</option>
            </select>
          </div>
          {motivo === "OUTRO" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="motivoDetalhe" className="text-sm font-medium text-neutral-700">
                Descreva o motivo
              </label>
              <input
                id="motivoDetalhe"
                name="motivoDetalhe"
                type="text"
                required
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="observacao" className="text-sm font-medium text-neutral-700">
          Observação (opcional)
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={2}
          placeholder="ex: loja em reforma, trocou de gerente nesse período..."
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {pending ? "Criando..." : "Iniciar lançamento"}
      </button>
    </form>
  );
}
