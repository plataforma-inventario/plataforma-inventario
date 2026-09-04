import Link from "next/link";
import { auth } from "@/auth";
import { getLojasVisiveis } from "@/lib/access";

export default async function Home() {
  const session = await auth();
  if (!session) return null;

  const lojas = await getLojasVisiveis(session.user);
  const semCiclo = lojas.filter((l) => !l.cicloContagem).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-medium text-neutral-900">Visão geral</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/lojas"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-300"
        >
          <p className="text-sm text-neutral-500">Lojas</p>
          <p className="text-2xl font-semibold text-neutral-900">{lojas.length}</p>
        </Link>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Sem ciclo de contagem definido</p>
          <p className="text-2xl font-semibold text-neutral-900">{semCiclo}</p>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-neutral-400">
          <p className="text-sm">Inventários, Ranking e demais módulos</p>
          <p className="text-sm">chegam nas próximas etapas</p>
        </div>
      </div>
    </div>
  );
}
