import { prisma } from "@/lib/prisma";
import { lojasVisiveisWhere } from "@/lib/access";
import { calcularDivergencia } from "@/lib/divergencia";
import type { DirecaoMovimento, PerfilAcesso, TipoInventario, TipoLoja } from "@/generated/prisma/client";

type Usuario = { id: string; perfil: PerfilAcesso };

export type FiltrosRelatorio = {
  lojaId?: string;
  mes?: number; // 1-12
  ano?: number;
  tipoLoja?: TipoLoja;
  direcao?: DirecaoMovimento;
  tipoInventario?: TipoInventario;
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

export type LinhaInventarioRelatorio = {
  cicloId: string;
  lojaId: string;
  pdv: number;
  nomeLoja: string;
  tipoLoja: TipoLoja;
  regiaoNome: string | null;
  cicloContagem: string | null;
  dataFim: Date;
  tipoInventario: TipoInventario;
  divergenciaValor: number;
  percentualSobreEstoque: number | null;
};

// Item 3/9: lista de inventários cruzando todas as lojas, com os filtros
// pedidos (loja, mês, tipo de loja, ciclo, tipo de inventário).
export async function getInventarios(
  user: Usuario,
  filtros: FiltrosRelatorio = {}
): Promise<LinhaInventarioRelatorio[]> {
  const ids = await lojaIdsVisiveis(user, filtros.tipoLoja);

  const ciclos = await prisma.ciclo.findMany({
    where: {
      status: "FECHADO",
      lojaId: filtros.lojaId ? filtros.lojaId : { in: ids },
      tipoInventario: filtros.tipoInventario,
      dataFim: filtroData(filtros.mes, filtros.ano),
    },
    include: { loja: { include: { regiao: true } } },
    orderBy: { dataFim: "desc" },
    take: 300,
  });

  const linhas: LinhaInventarioRelatorio[] = [];
  for (const ciclo of ciclos) {
    const d = await calcularDivergencia(ciclo.id);
    if (d.totalItens === 0) continue;
    linhas.push({
      cicloId: ciclo.id,
      lojaId: ciclo.loja.id,
      pdv: ciclo.loja.pdv,
      nomeLoja: ciclo.loja.nome,
      tipoLoja: ciclo.loja.tipoLoja,
      regiaoNome: ciclo.loja.regiao?.nome ?? null,
      cicloContagem: ciclo.loja.cicloContagem,
      dataFim: ciclo.dataFim,
      tipoInventario: ciclo.tipoInventario,
      divergenciaValor: d.divergenciaValor,
      percentualSobreEstoque: d.percentualSobreEstoque,
    });
  }
  return linhas;
}
