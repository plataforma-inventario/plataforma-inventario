import { prisma } from "@/lib/prisma";
import { lojasVisiveisWhere } from "@/lib/access";
import type { DirecaoMovimento, PerfilAcesso, TipoLoja } from "@/generated/prisma/client";

type Usuario = { id: string; perfil: PerfilAcesso };

export type FiltrosRelatorio = {
  lojaId?: string;
  mes?: number; // 1-12
  ano?: number;
  tipoLoja?: TipoLoja;
  direcao?: DirecaoMovimento;
};

async function lojaIdsVisiveis(user: Usuario, tipoLoja?: TipoLoja) {
  const lojas = await prisma.loja.findMany({
    where: { ...lojasVisiveisWhere(user), ...(tipoLoja ? { tipoLoja } : {}) },
    select: { id: true },
  });
  return lojas.map((l) => l.id);
}

function filtroData(mes?: number, ano?: number) {
  if (!ano) return undefined;
  const inicio = new Date(ano, mes ? mes - 1 : 0, 1);
  const fim = mes ? new Date(ano, mes, 1) : new Date(ano + 1, 0, 1);
  return { gte: inicio, lt: fim };
}

export async function getAjustes(user: Usuario, filtros: FiltrosRelatorio = {}) {
  const ids = await lojaIdsVisiveis(user, filtros.tipoLoja);
  const itens = await prisma.itemAjuste.findMany({
    where: {
      direcao: filtros.direcao,
      dataMovimento: filtroData(filtros.mes, filtros.ano),
      arquivo: {
        ciclo: { lojaId: filtros.lojaId ? filtros.lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: true } } } } },
    orderBy: { dataMovimento: "desc" },
    take: 300,
  });

  const totalEntrada = itens
    .filter((i) => i.direcao === "ENTRADA")
    .reduce((acc, i) => acc + Number(i.valorTotalCusto), 0);
  const totalSaida = itens
    .filter((i) => i.direcao === "SAIDA")
    .reduce((acc, i) => acc + Number(i.valorTotalCusto), 0);

  return { itens, totalEntrada, totalSaida };
}

export async function getTransferencias(user: Usuario, filtros: FiltrosRelatorio = {}) {
  const ids = await lojaIdsVisiveis(user, filtros.tipoLoja);
  const itens = await prisma.itemTransferencia.findMany({
    where: {
      direcao: filtros.direcao,
      dataEmissao: filtroData(filtros.mes, filtros.ano),
      arquivo: {
        ciclo: { lojaId: filtros.lojaId ? filtros.lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: true } } } } },
    orderBy: { dataEmissao: "desc" },
    take: 300,
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
export async function getRequisicoes(user: Usuario, filtros: FiltrosRelatorio = {}) {
  const ids = await lojaIdsVisiveis(user, filtros.tipoLoja);
  const itens = await prisma.itemRequisicao.findMany({
    where: {
      dataRequisicao: filtroData(filtros.mes, filtros.ano),
      arquivo: {
        ciclo: { lojaId: filtros.lojaId ? filtros.lojaId : { in: ids } },
      },
    },
    include: { arquivo: { include: { ciclo: { include: { loja: { include: { grupo: true } } } } } } },
    orderBy: { dataRequisicao: "desc" },
    take: 300,
  });

  const custoTotal = itens.reduce((acc, i) => acc + Number(i.custoTotal), 0);

  return { itens, custoTotal };
}
