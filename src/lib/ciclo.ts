import { prisma } from "@/lib/prisma";
import { StatusCiclo } from "@/generated/prisma/client";

/**
 * Data de início automática de um novo ciclo de lançamento (item 2.1): a
 * data de fim do último ciclo FECHADO dessa loja, ou a data de cadastro da
 * loja se for o primeiro ciclo dela.
 */
export async function getDataInicioSugerida(lojaId: string): Promise<Date> {
  const ultimoCiclo = await prisma.ciclo.findFirst({
    where: { lojaId, status: StatusCiclo.FECHADO },
    orderBy: { dataFim: "desc" },
  });
  if (ultimoCiclo) return ultimoCiclo.dataFim;

  const loja = await prisma.loja.findUniqueOrThrow({ where: { id: lojaId } });
  return loja.createdAt;
}
