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

  const perfil = session.user.perfil;
  const podeGerenciar = perfil === "AUDITOR";
  const ehLogistica = perfil === "LOGISTICA";
  const ehGerente = perfil === "GERENTE_VAREJO" || perfil === "GERENTE_REVENDA";

  const itensNav = [
    { href: "/lojas", label: "Lojas", oculto: false },
    { href: "/ranking", label: "Ranking", oculto: false },
    { href: "/ajustes", label: "Ajustes", oculto: false },
    { href: "/transferencias", label: "Transferências", oculto: false },
    { href: "/requisicoes", label: "Requisições", oculto: ehLogistica },
    { href: "/defeitos", label: "Defeitos", oculto: ehLogistica },
    { href: "/logistica-reversa", label: "Logística Reversa", oculto: false },
    { href: "/cruzamento", label: "Cruzamentos", oculto: ehGerente },
    { href: "/itens", label: "Itens", oculto: ehGerente },
    { href: "/calendario", label: "Calendário", oculto: false },
    { href: "/usuarios", label: "Usuários", oculto: !podeGerenciar },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-base font-semibold text-neutral-900">
              Plataforma de Inventário
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-500">
                {session.user.nome} · {ROTULO_PERFIL[perfil]}
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
          <nav className="flex gap-4 overflow-x-auto text-sm text-neutral-600">
            {itensNav
              .filter((i) => !i.oculto)
              .map((i) => (
                <Link key={i.href} href={i.href} className="shrink-0 whitespace-nowrap hover:text-neutral-900">
                  {i.label}
                </Link>
              ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
