import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDataInicioSugerida } from "@/lib/ciclo";
import { NovoCicloForm } from "./novo-ciclo-form";

export default async function NovoCicloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil !== "AUDITOR") redirect("/lojas");

  const { id } = await params;
  const loja = await prisma.loja.findUnique({ where: { id } });
  if (!loja) notFound();

  const dataInicio = await getDataInicioSugerida(id);
  const cicloAberto = await prisma.ciclo.findFirst({
    where: { lojaId: id, status: "ABERTO" },
  });

  return (
    <div className="max-w-lg">
      <p className="text-sm text-neutral-500">
        PDV {loja.pdv} · {loja.nome}
      </p>
      <h1 className="mb-6 text-lg font-medium text-brand-dark">Novo lançamento</h1>

      {cicloAberto ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Já existe um lançamento em aberto para esta loja (período iniciado em{" "}
          {cicloAberto.dataInicio.toLocaleDateString("pt-BR")}). Finalize ou continue{" "}
          <a href={`/ciclos/${cicloAberto.id}`} className="underline">
            esse lançamento
          </a>{" "}
          antes de abrir um novo.
        </div>
      ) : (
        <NovoCicloForm lojaId={id} dataInicio={dataInicio.toISOString()} />
      )}
    </div>
  );
}
