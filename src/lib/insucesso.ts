import { prisma } from "@/lib/prisma";

export type LinhaEstatisticaInsucesso = {
  lojaId: string;
  pdv: number;
  nome: string;
  totalInsucessos: number;
  ultimoInsucesso: Date | null;
};

/**
 * Estatística de quais lojas não finalizam o processo de devolução
 * (muitos insucessos) vs. quais nunca tiveram um (zero insucessos).
 */
export async function getEstatisticasInsucesso(lojaIds: string[]): Promise<LinhaEstatisticaInsucesso[]> {
  const lojas = await prisma.loja.findMany({
    where: { id: { in: lojaIds }, ativa: true },
    include: {
      insucessos: { select: { data: true }, orderBy: { data: "desc" } },
    },
  });

  return lojas
    .map((loja) => ({
      lojaId: loja.id,
      pdv: loja.pdv,
      nome: loja.nome,
      totalInsucessos: loja.insucessos.length,
      ultimoInsucesso: loja.insucessos[0]?.data ?? null,
    }))
    .sort((a, b) => b.totalInsucessos - a.totalInsucessos);
}
