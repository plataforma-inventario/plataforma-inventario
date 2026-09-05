import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NovoGrupoForm } from "./novo-grupo-form";
import { removerGrupoCodigoEquivalente } from "./actions";

export default async function CodigosEquivalentesPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil === "GERENTE_VAREJO" || session.user.perfil === "GERENTE_REVENDA") {
    redirect("/");
  }

  const podeGerenciar = session.user.perfil === "AUDITOR";

  const grupos = await prisma.grupoCodigoEquivalente.findMany({
    include: { codigos: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cruzamento" className="text-sm text-neutral-500 hover:text-brand-dark hover:underline">
          ← Divergências cruzadas
        </Link>
        <h1 className="text-lg font-medium text-brand-dark">Códigos equivalentes</h1>
        <p className="text-sm text-neutral-500">
          Cadastre aqui quando o mesmo produto físico tiver mais de um código de produto (código
          legado/duplicado, por exemplo) — isso permite que o sistema cruze uma sobra num código
          com uma falta no outro, mesmo sendo códigos diferentes.
        </p>
      </div>

      {podeGerenciar && <NovoGrupoForm />}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Códigos</th>
              <th className="px-4 py-2 font-medium">Observação</th>
              {podeGerenciar && <th className="px-4 py-2 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {grupos.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-2 text-neutral-900">{g.descricao}</td>
                <td className="px-4 py-2 text-neutral-700">
                  {g.codigos.map((c) => c.codigoProduto).join(", ")}
                </td>
                <td className="px-4 py-2 text-neutral-500">{g.observacao ?? "—"}</td>
                {podeGerenciar && (
                  <td className="px-4 py-2">
                    <form action={removerGrupoCodigoEquivalente.bind(null, g.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={podeGerenciar ? 4 : 3} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum grupo de códigos equivalentes cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
