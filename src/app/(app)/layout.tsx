import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const ROTULO_PERFIL: Record<string, string> = {
  AUDITOR: "Auditor",
  DIRETORIA: "Diretoria",
  GERENTE_VAREJO: "Gerente comercial — Varejo",
  GERENTE_REVENDA: "Gerente comercial — Revenda",
  LOGISTICA: "Logística / Centro de Distribuição",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const podeGerenciar = session.user.perfil === "AUDITOR";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-base font-semibold text-neutral-900">
              Plataforma de Inventário
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/lojas" className="hover:text-neutral-900">
                Lojas
              </Link>
              {podeGerenciar && (
                <Link href="/usuarios" className="hover:text-neutral-900">
                  Usuários
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">
              {session.user.nome} · {ROTULO_PERFIL[session.user.perfil]}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
