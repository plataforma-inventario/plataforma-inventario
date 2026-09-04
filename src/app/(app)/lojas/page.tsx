import Link from "next/link";
import { auth } from "@/auth";
import { getLojasVisiveis } from "@/lib/access";

const ROTULO_TIPO: Record<string, string> = {
  VAREJO: "Varejo",
  REVENDA: "Revenda",
  LOGISTICA: "Logística",
};

const ROTULO_CICLO: Record<string, string> = {
  MENSAL: "Mensal",
  BIMESTRAL: "Bimestral",
  TRIMESTRAL: "Trimestral",
};

export default async function LojasPage() {
  const session = await auth();
  if (!session) return null;

  const lojas = await getLojasVisiveis(session.user);
  const podeGerenciar = session.user.perfil === "AUDITOR";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-brand-dark">Lojas ({lojas.length})</h1>
        {podeGerenciar && (
          <Link
            href="/lojas/novo"
            className="rounded-md bg-brand-dark px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark-hover"
          >
            + Nova loja
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">PDV</th>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Grupo</th>
              <th className="px-4 py-2 font-medium">Região</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Ciclo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {lojas.map((loja) => (
              <tr key={loja.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2 text-neutral-500">
                  <Link href={`/lojas/${loja.id}`} className="block">
                    {loja.pdv}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/lojas/${loja.id}`} className="block text-neutral-900 hover:text-brand-dark hover:underline">
                    {loja.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-700">{loja.grupo.nome}</td>
                <td className="px-4 py-2 text-neutral-700">{loja.regiao?.nome ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-700">{ROTULO_TIPO[loja.tipoLoja]}</td>
                <td className="px-4 py-2 text-neutral-700">
                  {loja.cicloContagem ? (
                    ROTULO_CICLO[loja.cicloContagem]
                  ) : (
                    <span className="text-amber-600">não definido</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
