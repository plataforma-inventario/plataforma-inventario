import type { Grupo, Regiao } from "@/generated/prisma/client";

type Props = {
  grupos: Grupo[];
  regioes: Regiao[];
  defaultValues?: {
    pdv?: number;
    nome?: string;
    cnpj?: string;
    tipoUnidade?: string;
    tipoLoja?: string;
    grupoId?: string;
    regiaoId?: string | null;
    cicloContagem?: string | null;
  };
  /** PDV só pode ser definido na criação — depois de lançamentos vinculados, mudar o PDV quebraria o histórico. */
  pdvEditavel?: boolean;
};

export function LojaFields({ grupos, regioes, defaultValues, pdvEditavel = true }: Props) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="pdv" className="text-sm font-medium text-neutral-700">
          PDV
        </label>
        <input
          id="pdv"
          name="pdv"
          type="number"
          required
          disabled={!pdvEditavel}
          defaultValue={defaultValues?.pdv}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:bg-neutral-100 disabled:text-neutral-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium text-neutral-700">
          Nome da loja
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={defaultValues?.nome}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cnpj" className="text-sm font-medium text-neutral-700">
          CNPJ
        </label>
        <input
          id="cnpj"
          name="cnpj"
          type="text"
          required
          placeholder="00.000.000/0000-00"
          defaultValue={defaultValues?.cnpj}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="grupoId" className="text-sm font-medium text-neutral-700">
            Grupo
          </label>
          <select
            id="grupoId"
            name="grupoId"
            required
            defaultValue={defaultValues?.grupoId ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="regiaoId" className="text-sm font-medium text-neutral-700">
            Região
          </label>
          <select
            id="regiaoId"
            name="regiaoId"
            defaultValue={defaultValues?.regiaoId ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="">Sem região</option>
            {regioes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="tipoUnidade" className="text-sm font-medium text-neutral-700">
            Unidade
          </label>
          <select
            id="tipoUnidade"
            name="tipoUnidade"
            defaultValue={defaultValues?.tipoUnidade ?? "FILIAL"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="MATRIZ">Matriz</option>
            <option value="FILIAL">Filial</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tipoLoja" className="text-sm font-medium text-neutral-700">
            Tipo
          </label>
          <select
            id="tipoLoja"
            name="tipoLoja"
            defaultValue={defaultValues?.tipoLoja ?? "VAREJO"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="VAREJO">Varejo</option>
            <option value="REVENDA">Revenda</option>
            <option value="LOGISTICA">Logística</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cicloContagem" className="text-sm font-medium text-neutral-700">
          Ciclo de contagem
        </label>
        <select
          id="cicloContagem"
          name="cicloContagem"
          defaultValue={defaultValues?.cicloContagem ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Não definido</option>
          <option value="MENSAL">Mensal</option>
          <option value="BIMESTRAL">Bimestral</option>
          <option value="TRIMESTRAL">Trimestral</option>
        </select>
      </div>
    </>
  );
}
