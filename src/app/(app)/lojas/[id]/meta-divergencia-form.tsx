import { atualizarMetaDivergencia } from "../actions";

type ValoresMeta = {
  metaDivergenciaPercentual: string | null;
  metaDivergenciaValor: string | null;
  metaSacolaPercentual: string | null;
  metaSacolaValor: string | null;
  metaRestoPercentual: string | null;
  metaRestoValor: string | null;
};

function CampoMeta({
  idPercentual,
  idValor,
  rotulo,
  valorPercentual,
  valorValor,
}: {
  idPercentual: string;
  idValor: string;
  rotulo: string;
  valorPercentual: string | null;
  valorValor: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-neutral-700">{rotulo}</p>
      <div className="flex gap-2">
        <input
          id={idPercentual}
          name={idPercentual}
          type="number"
          step="0.01"
          min="0"
          defaultValue={valorPercentual ?? ""}
          placeholder="% ex: 2,00"
          className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          id={idValor}
          name={idValor}
          type="number"
          step="0.01"
          min="0"
          defaultValue={valorValor ?? ""}
          placeholder="R$ ex: 500,00"
          className="w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>
    </div>
  );
}

export function MetaDivergenciaForm({ lojaId, ...valores }: { lojaId: string } & ValoresMeta) {
  return (
    <form
      action={atualizarMetaDivergencia.bind(null, lojaId)}
      className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <CampoMeta
        idPercentual="metaDivergenciaPercentual"
        idValor="metaDivergenciaValor"
        rotulo="Meta geral (% sobre faturamento)"
        valorPercentual={valores.metaDivergenciaPercentual}
        valorValor={valores.metaDivergenciaValor}
      />
      <CampoMeta
        idPercentual="metaSacolaPercentual"
        idValor="metaSacolaValor"
        rotulo="Teto sacola/material auxiliar"
        valorPercentual={valores.metaSacolaPercentual}
        valorValor={valores.metaSacolaValor}
      />
      <CampoMeta
        idPercentual="metaRestoPercentual"
        idValor="metaRestoValor"
        rotulo="Teto sem sacola"
        valorPercentual={valores.metaRestoPercentual}
        valorValor={valores.metaRestoValor}
      />
      <input type="hidden" name="motivo" value="Meta de divergência definida pela Diretoria" />
      <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
        Salvar metas
      </button>
      <p className="w-full text-xs text-neutral-400">
        Item 10.2 — a meta geral aparece sinalizada no ranking entre lojas, comparada com a
        divergência em % sobre o faturamento do período (não sobre o estoque contado, que só
        reflete os itens com diferença). Os tetos de sacola/sem-sacola aparecem no lançamento
        fechado, comparando cada categoria com o teto dela sobre o estoque contado da própria
        categoria.
      </p>
    </form>
  );
}
