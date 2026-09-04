import { prisma } from "@/lib/prisma";
import { lojasVisiveisWhere } from "@/lib/access";
import type { PerfilAcesso } from "@/generated/prisma/client";

type Usuario = { id: string; perfil: PerfilAcesso };

async function lojaIdsVisiveis(user: Usuario) {
  const lojas = await prisma.loja.findMany({
    where: lojasVisiveisWhere(user),
    select: { id: true },
  });
  return lojas.map((l) => l.id);
}

export async function getAjustes(user: Usuario, lojaId?: string) {
  const ids = await lojaIdsVisiveis(user);
  const itens = await prisma.itemAjuste.findMany({
    where: {
      arquivo: {
        ciclo: { lojaId: lojaId ? lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: true } } } } },
    orderBy: { dataMovimento: "desc" },
    take: 200,
  });

  const totalEntrada = itens
    .filter((i) => i.direcao === "ENTRADA")
    .reduce((acc, i) => acc + Number(i.valorTotalCusto), 0);
  const totalSaida = itens
    .filter((i) => i.direcao === "SAIDA")
    .reduce((acc, i) => acc + Number(i.valorTotalCusto), 0);

  return { itens, totalEntrada, totalSaida };
}

export async function getTransferencias(user: Usuario, lojaId?: string) {
  const ids = await lojaIdsVisiveis(user);
  const itens = await prisma.itemTransferencia.findMany({
    where: {
      arquivo: {
        ciclo: { lojaId: lojaId ? lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: true } } } } },
    orderBy: { dataEmissao: "desc" },
    take: 200,
  });

  const totalEntrada = itens
    .filter((i) => i.direcao === "ENTRADA")
    .reduce((acc, i) => acc + Number(i.valorTotalItem), 0);
  const totalSaida = itens
    .filter((i) => i.direcao === "SAIDA")
    .reduce((acc, i) => acc + Number(i.valorTotalItem), 0);

  return { itens, totalEntrada, totalSaida };
}

// Item 6: nunca mostra PDV, só razão social (o vínculo com o PDV é interno,
// resolvido via arquivo -> ciclo -> loja, mas nunca exibido no relatório).
export async function getRequisicoes(user: Usuario, lojaId?: string) {
  const ids = await lojaIdsVisiveis(user);
  const itens = await prisma.itemRequisicao.findMany({
    where: {
      arquivo: {
        ciclo: { lojaId: lojaId ? lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: { include: { grupo: true } } } } } } },
    orderBy: { dataRequisicao: "desc" },
    take: 200,
  });

  const custoTotal = itens.reduce((acc, i) => acc + Number(i.custoTotal), 0);

  return { itens, custoTotal };
}
