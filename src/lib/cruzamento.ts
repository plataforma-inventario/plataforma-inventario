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
  lojaFalta: { id: string; pdv: number; nome: string; quantidade: number; cicloId: string };
  lojaSobra: { id: string; pdv: number; nome: string; quantidade: number; cicloId: string };
  // Item 5.1 (refinado a pedido do usuário em 2026-09-04): a confiança combina
  // quantidade de produtos batendo E o tamanho da quantidade de cada match -
  // um match de 1 unidade só é fraco sinal sozinho, mas 3+ deles no mesmo par
  // de lojas já não parece coincidência; e qualquer match de mais de 1
  // unidade já é forte o bastante pra confirmar sozinho.
  confianca: "CONFIRMADA" | "SUSPEITA_NIVEL_2" | "SUSPEITA_NIVEL_1";
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

  // Por par de lojas: conta quantos produtos batem exatamente em 1 unidade
  // (sinal fraco sozinho, mas 3+ deles já não parece coincidência) e marca
  // se algum produto bate em mais de 1 unidade (sinal forte, confirma sozinho).
  const contagemUnidadeUnicaPorPar = new Map<string, number>();
  const temQuantidadeMaiorPorPar = new Map<string, boolean>();
  const paresPorProduto: { produto: string; falta: Residual; sobra: Residual; quantidade: number }[] = [];

  for (const [produto, lista] of porProduto) {
    const faltas = lista.filter((r) => r.residual < 0);
    const sobras = lista.filter((r) => r.residual > 0);

    for (const falta of faltas) {
      for (const sobra of sobras) {
        if (falta.lojaId === sobra.lojaId) continue;
        if (!periodosSeSobrepoe(falta, sobra)) continue;
        if (Math.abs(Math.abs(falta.residual) - sobra.residual) > EPSILON) continue; // quantidade precisa bater

        const parKey = [falta.lojaId, sobra.lojaId].sort().join("::");
        const quantidade = sobra.residual;
        if (quantidade > 1 + EPSILON) {
          temQuantidadeMaiorPorPar.set(parKey, true);
        } else {
          contagemUnidadeUnicaPorPar.set(parKey, (contagemUnidadeUnicaPorPar.get(parKey) ?? 0) + 1);
        }
        paresPorProduto.push({ produto, falta, sobra, quantidade });
      }
    }
  }

  return paresPorProduto.map(({ produto, falta, sobra, quantidade }) => {
    const parKey = [falta.lojaId, sobra.lojaId].sort().join("::");

    let confianca: DivergenciaCruzada["confianca"];
    if (temQuantidadeMaiorPorPar.get(parKey)) {
      // qualquer produto com mais de 1 unidade batendo já confirma o par inteiro
      confianca = "CONFIRMADA";
    } else if ((contagemUnidadeUnicaPorPar.get(parKey) ?? 0) >= 3) {
      confianca = "SUSPEITA_NIVEL_2";
    } else {
      confianca = "SUSPEITA_NIVEL_1";
    }

    return {
      codigoProduto: produto,
      descricaoProduto: falta.descricaoProduto,
      lojaFalta: {
        id: falta.lojaId,
        pdv: falta.lojaPdv,
        nome: falta.lojaNome,
        quantidade: falta.residual,
        cicloId: falta.cicloId,
      },
      lojaSobra: {
        id: sobra.lojaId,
        pdv: sobra.lojaPdv,
        nome: sobra.lojaNome,
        quantidade: sobra.residual,
        cicloId: sobra.cicloId,
      },
      confianca,
    };
  });
}
