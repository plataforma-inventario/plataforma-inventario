import { atualizarMetaDivergencia } from "../actions";

export function MetaDivergenciaForm({
  lojaId,
  metaDivergenciaPercentual,
  metaDivergenciaValor,
}: {
  lojaId: string;
  metaDivergenciaPercentual: string | null;
  metaDivergenciaValor: string | null;
}) {
  return (
    <form
      action={atualizarMetaDivergencia.bind(null, lojaId)}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="metaDivergenciaPercentual" className="text-sm font-medium text-neutral-700">
          Meta de divergência (%)
        </label>
        <input
          id="metaDivergenciaPercentual"
          name="metaDivergenciaPercentual"
          type="number"
          step="0.01"
          min="0"
          defaultValue={metaDivergenciaPercentual ?? ""}
          placeholder="ex: 2,00"
          className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="metaDivergenciaValor" className="text-sm font-medium text-neutral-700">
          Meta de divergência (R$)
        </label>
        <input
          id="metaDivergenciaValor"
          name="metaDivergenciaValor"
          type="number"
          step="0.01"
          min="0"
          defaultValue={metaDivergenciaValor ?? ""}
          placeholder="ex: 500,00"
          className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
      <input type="hidden" name="motivo" value="Meta de divergência definida pela Diretoria" />
      <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
        Salvar meta
      </button>
      <p className="w-full text-xs text-neutral-400">
        Item 10.2 — quem ultrapassar essa meta aparece sinalizado no ranking entre lojas.
      </p>
    </form>
  );
}
