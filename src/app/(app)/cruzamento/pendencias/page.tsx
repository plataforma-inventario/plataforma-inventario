import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTransferenciasPendentes, getAjustesPendentes } from "@/lib/pendencias";

export default async function PendenciasPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil === "GERENTE_VAREJO" || session.user.perfil === "GERENTE_REVENDA") {
    redirect("/");
  }

  const [transferencias, ajustes] = await Promise.all([
    getTransferenciasPendentes(),
    getAjustesPendentes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cruzamento" className="text-sm text-neutral-500 hover:text-brand-dark hover:underline">
          ← Divergências cruzadas
        </Link>
        <h1 className="text-lg font-medium text-brand-dark">Pendências de saída sem chegada</h1>
        <p className="text-sm text-neutral-500">
          Mercadoria que saiu de uma loja (Transferência ou Ajuste) e ainda não tem registro de
          chegada em nenhuma outra — antes mesmo de aparecer como divergência de inventário.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-900">
          Transferências — {transferencias.length} pendente(s)
        </h2>
        <p className="mb-3 text-xs text-neutral-400">
          Toda saída cuja NF + produto não aparece em nenhuma entrada registrada ainda.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">NF</th>
                <th className="px-4 py-2 font-medium">Saiu de</th>
                <th className="px-4 py-2 font-medium">Destino (contraparte)</th>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Qtde</th>
                <th className="px-4 py-2 font-medium">Emissão</th>
                <th className="px-4 py-2 font-medium">Dias pendente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transferencias.map((t, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-neutral-500">{t.numeroDocumento}</td>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/lojas/${t.loja.id}`} className="hover:text-brand-dark hover:underline">
                      {t.loja.pdv} — {t.loja.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{t.contraparteNome}</td>
                  <td className="px-4 py-2 text-neutral-900">
                    {t.codigoProduto} — {t.descricaoProduto}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{t.quantidade}</td>
                  <td className="px-4 py-2 text-neutral-500">{t.dataEmissao.toLocaleDateString("pt-BR")}</td>
                  <td
                    className={`px-4 py-2 font-medium ${t.diasPendente > 30 ? "text-red-600" : "text-amber-700"}`}
                  >
                    {t.diasPendente}
                  </td>
                </tr>
              ))}
              {transferencias.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-400">
                    Nenhuma saída pendente sem chegada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-900">
          Ajustes — {ajustes.length} pendente(s)
        </h2>
        <p className="mb-3 text-xs text-neutral-400">
          Como Ajuste não tem NF, um item só aparece aqui depois que a loja dele já fechou um
          ciclo posterior sem que nenhum outro item de produto/quantidade igual tenha aparecido em
          outra loja — antes disso, fica em espera, não é considerado pendência ainda.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Loja</th>
                <th className="px-4 py-2 font-medium">Direção</th>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Qtde</th>
                <th className="px-4 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ajustes.map((a, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/lojas/${a.loja.id}`} className="hover:text-brand-dark hover:underline">
                      {a.loja.pdv} — {a.loja.nome}
                    </Link>
                  </td>
                  <td className={`px-4 py-2 ${a.direcao === "ENTRADA" ? "text-emerald-700" : "text-red-600"}`}>
                    {a.direcao === "ENTRADA" ? "Entrada" : "Saída"}
                  </td>
                  <td className="px-4 py-2 text-neutral-900">
                    {a.codigoProduto} — {a.descricaoProduto}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{a.quantidade}</td>
                  <td className="px-4 py-2 text-neutral-500">{a.dataMovimento.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {ajustes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                    Nenhum ajuste pendente sem par confirmado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
