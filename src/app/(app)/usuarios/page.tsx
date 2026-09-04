import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsuarioForm } from "./usuario-form";
import { alternarAtivo } from "./actions";

const ROTULO_PERFIL: Record<string, string> = {
  AUDITOR: "Auditor",
  DIRETORIA: "Diretoria",
  GERENTE_VAREJO: "Gerente — Varejo",
  GERENTE_REVENDA: "Gerente — Revenda",
  LOGISTICA: "Logística",
};

export default async function UsuariosPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil !== "AUDITOR") redirect("/");

  const usuarios = await prisma.user.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-medium text-neutral-900">
          Usuários ({usuarios.length})
        </h1>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Perfil</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-neutral-900">{u.nome}</td>
                  <td className="px-4 py-2 text-neutral-700">{u.email}</td>
                  <td className="px-4 py-2 text-neutral-700">{ROTULO_PERFIL[u.perfil]}</td>
                  <td className="px-4 py-2">
                    <form action={alternarAtivo.bind(null, u.id, !u.ativo)}>
                      <button
                        className={
                          u.ativo
                            ? "text-emerald-700 hover:underline"
                            : "text-neutral-400 hover:underline"
                        }
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Novo usuário</h2>
        <UsuarioForm />
      </div>
    </div>
  );
}
