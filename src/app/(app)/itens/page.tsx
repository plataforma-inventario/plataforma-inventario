import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRankingItens } from "@/lib/sku-ranking";

export default async function ItensPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil === "GERENTE_VAREJO" || session.user.perfil === "GERENTE_REVENDA") {
    redirect("/");
  }

  const linhas = await getRankingItens();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium text-brand-dark">Itens problemáticos</h1>
        <p className="text-sm text-neutral-500">
          Mesmo SKU cruzado em todos os módulos — ajuda a identificar item estruturalmente mal
          controlado (ex: sempre vira demonstrador e nunca é baixado certo) e não só divergência
          pontual de estoque.
        </p>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-400">Ainda não há dados suficientes para o ranking.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Divergência inventário</th>
                <th className="px-4 py-2 font-medium">Sobra</th>
                <th className="px-4 py-2 font-medium">Falta</th>
                <th className="px-4 py-2 font-medium">Demonstrador</th>
                <th className="px-4 py-2 font-medium">Brinde</th>
                <th className="px-4 py-2 font-medium">Perda/roubo</th>
                <th className="px-4 py-2 font-medium">Defeito</th>
                <th className="px-4 py-2 font-medium">Cruzamento suspeito</th>
                <th className="px-4 py-2 font-medium">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {linhas.slice(0, 100).map((l, i) => (
                <tr key={l.codigoProduto}>
                  <td className="px-4 py-2 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-2 text-neutral-900">
                    {l.codigoProduto} — {l.descricaoProduto}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasDivergenciaInventario}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasSobra}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasFalta}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasDemonstrador}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasBrinde}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasPerdaRoubo}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasDefeito}</td>
                  <td className="px-4 py-2 text-neutral-700">{l.ocorrenciasCruzamentoSuspeito}</td>
                  <td className="px-4 py-2 font-medium text-neutral-900">{l.peso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
