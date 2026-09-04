import { prisma } from "@/lib/prisma";

const EPSILON = 0.01;

type Residual = {
  lojaId: string;
  lojaNome: string;
  lojaPdv: number;
  cicloId: string;
  dataInicio: Date;
  dataFim: Date;
  codigoProduto: string;
  descricaoProduto: string;
  residual: number;
};

export type DivergenciaCruzada = {
  codigoProduto: string;
  descricaoProduto: string;
  lojaFalta: { id: string; pdv: number; nome: string; quantidade: number };
  lojaSobra: { id: string; pdv: number; nome: string; quantidade: number };
  confianca: "PROVAVEL" | "SUSPEITA";
};

function periodosSeSobrepoe(a: Residual, b: Residual) {
  return a.dataInicio <= b.dataFim && a.dataFim >= b.dataInicio;
}

/**
 * Item 5.1: cruza a divergência de inventário de TODAS as lojas do sistema
 * (não só da mesma região - transferências acontecem entre regiões
 * diferentes também) contra o que já foi explicado por Transferência ou
 * Ajuste no mesmo ciclo/loja. O que sobrar sem explicação, se bater entre
 * duas lojas em quantidade oposta no mesmo período, vira uma suspeita de
 * movimentação não registrada.
 */
export async function getDivergenciasCruzadas(): Promise<DivergenciaCruzada[]> {
  const [inventarios, transferencias, ajustes] = await Promise.all([
    prisma.itemInventario.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        descricaoProduto: true,
        ajuste: true,
        arquivo: {
          select: {
            ciclo: {
              select: {
                id: true,
                dataInicio: true,
                dataFim: true,
                loja: { select: { id: true, nome: true, pdv: true } },
              },
            },
          },
        },
      },
    }),
    prisma.itemTransferencia.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        direcao: true,
        quantidade: true,
        arquivo: { select: { ciclo: { select: { id: true } } } },
      },
    }),
    prisma.itemAjuste.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        direcao: true,
        quantidade: true,
        arquivo: { select: { ciclo: { select: { id: true } } } },
      },
    }),
  ]);

  // net explicado (entrada - saida) por (cicloId, codigoProduto)
  const explicadoPorCicloProduto = new Map<string, number>();
  for (const t of [...transferencias, ...ajustes]) {
    const chave = `${t.arquivo.ciclo.id}::${t.codigoProduto}`;
    const sinal = t.direcao === "ENTRADA" ? 1 : -1;
    explicadoPorCicloProduto.set(
      chave,
      (explicadoPorCicloProduto.get(chave) ?? 0) + sinal * Number(t.quantidade)
    );
  }

  const residuos: Residual[] = [];
  for (const inv of inventarios) {
    const chave = `${inv.arquivo.ciclo.id}::${inv.codigoProduto}`;
    const explicado = explicadoPorCicloProduto.get(chave) ?? 0;
    const residual = Number(inv.ajuste) - explicado;
    if (Math.abs(residual) < EPSILON) continue;

    residuos.push({
      lojaId: inv.arquivo.ciclo.loja.id,
      lojaNome: inv.arquivo.ciclo.loja.nome,
      lojaPdv: inv.arquivo.ciclo.loja.pdv,
      cicloId: inv.arquivo.ciclo.id,
      dataInicio: inv.arquivo.ciclo.dataInicio,
      dataFim: inv.arquivo.ciclo.dataFim,
      codigoProduto: inv.codigoProduto,
      descricaoProduto: inv.descricaoProduto,
      residual,
    });
  }

  // agrupa por produto
  const porProduto = new Map<string, Residual[]>();
  for (const r of residuos) {
    const lista = porProduto.get(r.codigoProduto) ?? [];
    lista.push(r);
    porProduto.set(r.codigoProduto, lista);
  }

  // conta, por par de lojas, quantos produtos batem em quantidade oposta
  // (usado pra decidir PROVAVEL vs SUSPEITA - "varios itens" = par recorrente)
  const contagemPorPar = new Map<string, number>();
  const paresPorProduto: { produto: string; falta: Residual; sobra: Residual }[] = [];

  for (const [produto, lista] of porProduto) {
    const faltas = lista.filter((r) => r.residual < 0);
    const sobras = lista.filter((r) => r.residual > 0);

    for (const falta of faltas) {
      for (const sobra of sobras) {
        if (falta.lojaId === sobra.lojaId) continue;
        if (!periodosSeSobrepoe(falta, sobra)) continue;
        if (Math.abs(Math.abs(falta.residual) - sobra.residual) > EPSILON) continue; // quantidade precisa bater

        const parKey = [falta.lojaId, sobra.lojaId].sort().join("::");
        contagemPorPar.set(parKey, (contagemPorPar.get(parKey) ?? 0) + 1);
        paresPorProduto.push({ produto, falta, sobra });
      }
    }
  }

  return paresPorProduto.map(({ produto, falta, sobra }) => {
    const parKey = [falta.lojaId, sobra.lojaId].sort().join("::");
    const quantosProdutosNessePar = contagemPorPar.get(parKey) ?? 1;

    return {
      codigoProduto: produto,
      descricaoProduto: falta.descricaoProduto,
      lojaFalta: { id: falta.lojaId, pdv: falta.lojaPdv, nome: falta.lojaNome, quantidade: falta.residual },
      lojaSobra: { id: sobra.lojaId, pdv: sobra.lojaPdv, nome: sobra.lojaNome, quantidade: sobra.residual },
      confianca: quantosProdutosNessePar >= 2 ? "PROVAVEL" : "SUSPEITA",
    };
  });
}
