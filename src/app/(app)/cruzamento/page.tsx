import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDivergenciasCruzadas } from "@/lib/cruzamento";

const ROTULO_CONFIANCA: Record<string, string> = {
  CONFIRMADA: "Confirmada",
  SUSPEITA_NIVEL_2: "Suspeita (nível 2)",
  SUSPEITA_NIVEL_1: "Suspeita (nível 1)",
};

const COR_CONFIANCA: Record<string, string> = {
  CONFIRMADA: "bg-red-50 text-red-700",
  SUSPEITA_NIVEL_2: "bg-amber-50 text-amber-700",
  SUSPEITA_NIVEL_1: "bg-neutral-100 text-neutral-600",
};

export default async function CruzamentoPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil === "GERENTE_VAREJO" || session.user.perfil === "GERENTE_REVENDA") {
    redirect("/");
  }

  const divergencias = await getDivergenciasCruzadas();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Divergências cruzadas</h1>
          <p className="text-sm text-neutral-500">
            Item faltando numa loja e sobrando em outra, no mesmo período, sem transferência ou
            ajuste que explique — considerando todas as lojas do sistema, não só da mesma região.
          </p>
        </div>
        <Link
          href="/cruzamento/pendencias"
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Pendências de saída sem chegada
        </Link>
      </div>

      {divergencias.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nenhuma divergência cruzada não explicada encontrada até agora.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">Falta em</th>
                <th className="px-4 py-2 font-medium">Sobra em</th>
                <th className="px-4 py-2 font-medium">Quantidade</th>
                <th className="px-4 py-2 font-medium">Confiança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {divergencias.map((d, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-neutral-900">
                    {d.codigoProduto} — {d.descricaoProduto}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/lojas/${d.lojaFalta.id}`} className="hover:text-brand-dark hover:underline">
                      {d.lojaFalta.pdv} — {d.lojaFalta.nome}
                    </Link>{" "}
                    <Link
                      href={`/ciclos/${d.lojaFalta.cicloId}`}
                      className="text-xs text-neutral-400 hover:text-brand-dark hover:underline"
                    >
                      (ver lançamento)
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-700">
                    <Link href={`/lojas/${d.lojaSobra.id}`} className="hover:text-brand-dark hover:underline">
                      {d.lojaSobra.pdv} — {d.lojaSobra.nome}
                    </Link>{" "}
                    <Link
                      href={`/ciclos/${d.lojaSobra.cicloId}`}
                      className="text-xs text-neutral-400 hover:text-brand-dark hover:underline"
                    >
                      (ver lançamento)
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{d.lojaSobra.quantidade}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_CONFIANCA[d.confianca]}`}>
                      {ROTULO_CONFIANCA[d.confianca]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
