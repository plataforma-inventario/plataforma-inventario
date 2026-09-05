import { prisma } from "@/lib/prisma";

export type ResultadoDivergencia = {
  // quantos ItemInventario entraram no cálculo (0 = sem arquivo de inventário lido ainda)
  totalItens: number;
  divergenciaValor: number; // soma de valorAjuste (com sinal: negativo = falta, positivo = sobra)
  valorEstoqueTotal: number; // soma de valorEstoque (base para o % sobre estoque)
  percentualSobreEstoque: number | null;
  percentualSobreFaturamento: number | null; // null se não houver Faturamento lido
  receitaLiquida: number | null;
  sacolaMaterialAuxiliar: CategoriaDivergencia;
  resto: CategoriaDivergencia;
  // Pedido pelo usuário em 2026-09-04, pra ler o resultado de forma mais
  // direta: "quanto % da divergência total é só sacola" e "quanto sobraria
  // de divergência se a sacola nem existisse", usando sempre o MESMO
  // estoque total como base (não o estoque de cada categoria separado) -
  // assim dá pra comparar direto com percentualSobreEstoque acima.
  percentualSacolaSobreDivergenciaTotal: number | null;
  percentualSemSacolaSobreEstoqueTotal: number | null;
};

export type CategoriaDivergencia = {
  divergenciaValor: number;
  valorEstoque: number;
  // % dentro da própria categoria (ex: divergência de sacola sobre o valor
  // de estoque de sacola contado) - usado contra o teto por categoria
  // (item pedido pelo usuário em 2026-09-04, meta separada com/sem sacola).
  percentualSobreEstoque: number | null;
  totalItens: number;
};

/**
 * Item 3 do briefing: divergência em R$ e % (geral, e separado sacola/material
 * auxiliar vs. resto), com % também sobre o faturamento do período. Calculado
 * na hora a partir das linhas já estruturadas pelo parsing (Etapa 4) - não
 * precisa ser persistido, o volume por ciclo é pequeno.
 */
export async function calcularDivergencia(cicloId: string): Promise<ResultadoDivergencia> {
  const itens = await prisma.itemInventario.findMany({
    where: { arquivo: { cicloId, categoria: "INVENTARIO" } },
    select: { descricaoProduto: true, valorAjuste: true, valorEstoque: true },
  });

  const faturamento = await prisma.faturamento.findFirst({
    where: { arquivo: { cicloId, categoria: "FATURAMENTO" } },
  });

  const somaDecimal = (campo: "valorAjuste" | "valorEstoque", lista: typeof itens) =>
    lista.reduce((acc, i) => acc + Number(i[campo]), 0);

  const ehSacolaOuMaterialAuxiliar = (descricao: string) => /sacola/i.test(descricao);

  const itensSacola = itens.filter((i) => ehSacolaOuMaterialAuxiliar(i.descricaoProduto));
  const itensResto = itens.filter((i) => !ehSacolaOuMaterialAuxiliar(i.descricaoProduto));

  const divergenciaValor = somaDecimal("valorAjuste", itens);
  const valorEstoqueTotal = somaDecimal("valorEstoque", itens);
  const receitaLiquida = faturamento ? Number(faturamento.receitaLiquida) : null;

  const categoriaDivergencia = (lista: typeof itens): CategoriaDivergencia => {
    const divergenciaValorCategoria = somaDecimal("valorAjuste", lista);
    const valorEstoqueCategoria = somaDecimal("valorEstoque", lista);
    return {
      divergenciaValor: divergenciaValorCategoria,
      valorEstoque: valorEstoqueCategoria,
      percentualSobreEstoque:
        valorEstoqueCategoria > 0 ? (Math.abs(divergenciaValorCategoria) / valorEstoqueCategoria) * 100 : null,
      totalItens: lista.length,
    };
  };

  return {
    totalItens: itens.length,
    divergenciaValor,
    valorEstoqueTotal,
    percentualSobreEstoque:
      valorEstoqueTotal > 0 ? (Math.abs(divergenciaValor) / valorEstoqueTotal) * 100 : null,
    percentualSobreFaturamento:
      receitaLiquida && receitaLiquida > 0 ? (Math.abs(divergenciaValor) / receitaLiquida) * 100 : null,
    receitaLiquida,
    sacolaMaterialAuxiliar: categoriaDivergencia(itensSacola),
    resto: categoriaDivergencia(itensResto),
    percentualSacolaSobreDivergenciaTotal:
      divergenciaValor !== 0
        ? (Math.abs(somaDecimal("valorAjuste", itensSacola)) / Math.abs(divergenciaValor)) * 100
        : null,
    percentualSemSacolaSobreEstoqueTotal:
      valorEstoqueTotal > 0
        ? (Math.abs(somaDecimal("valorAjuste", itensResto)) / valorEstoqueTotal) * 100
        : null,
  };
}

export type PontoHistoricoDivergencia = {
  cicloId: string;
  dataFim: Date;
  tipoInventario: "CICLICO" | "COMPLETO";
  divergenciaValor: number;
  // % sobre estoque contado (só os itens divergentes, não o estoque real da
  // loja - ver percentualSobreFaturamento pra evolução comparável entre
  // ciclos). Mantido aqui só pra referência informativa.
  percentualSobreEstoque: number | null;
  percentualSobreFaturamento: number | null;
};

/**
 * Item 2.0: histórico de inventários da loja com evolução de divergência,
 * pra gráfico e pra achar o melhor/pior ciclo. Só considera ciclos
 * FECHADOS (com inventário já lido) e ignora os que não tiveram nenhum
 * item de inventário reconhecido (arquivo com erro, por exemplo).
 */
export async function getHistoricoDivergencia(lojaId: string): Promise<PontoHistoricoDivergencia[]> {
  const ciclos = await prisma.ciclo.findMany({
    where: { lojaId, status: "FECHADO" },
    orderBy: { dataFim: "asc" },
    select: { id: true, dataFim: true, tipoInventario: true },
  });

  const pontos: PontoHistoricoDivergencia[] = [];
  for (const ciclo of ciclos) {
    const d = await calcularDivergencia(ciclo.id);
    if (d.totalItens === 0) continue;
    pontos.push({
      cicloId: ciclo.id,
      dataFim: ciclo.dataFim,
      tipoInventario: ciclo.tipoInventario,
      divergenciaValor: d.divergenciaValor,
      percentualSobreEstoque: d.percentualSobreEstoque,
      percentualSobreFaturamento: d.percentualSobreFaturamento,
    });
  }
  return pontos;
}
