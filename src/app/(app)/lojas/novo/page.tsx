import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LojaForm } from "../loja-form";

export default async function NovaLojaPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil !== "AUDITOR") redirect("/lojas");

  const [grupos, regioes] = await Promise.all([
    prisma.grupo.findMany({ orderBy: { nome: "asc" } }),
    prisma.regiao.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-lg font-medium text-neutral-900">Nova loja</h1>
      <LojaForm grupos={grupos} regioes={regioes} />
    </div>
  );
}
