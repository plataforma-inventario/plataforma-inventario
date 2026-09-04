import { prisma } from "@/lib/prisma";

export type ResultadoDivergencia = {
  // quantos ItemInventario entraram no cálculo (0 = sem arquivo de inventário lido ainda)
  totalItens: number;
  divergenciaValor: number; // soma de valorAjuste (com sinal: negativo = falta, positivo = sobra)
  valorEstoqueTotal: number; // soma de valorEstoque (base para o % sobre estoque)
  percentualSobreEstoque: number | null;
  percentualSobreFaturamento: number | null; // null se não houver Faturamento lido
  receitaLiquida: number | null;
  sacolaMaterialAuxiliar: { divergenciaValor: number; totalItens: number };
  resto: { divergenciaValor: number; totalItens: number };
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

  return {
    totalItens: itens.length,
    divergenciaValor,
    valorEstoqueTotal,
    percentualSobreEstoque:
      valorEstoqueTotal > 0 ? (Math.abs(divergenciaValor) / valorEstoqueTotal) * 100 : null,
    percentualSobreFaturamento:
      receitaLiquida && receitaLiquida > 0 ? (Math.abs(divergenciaValor) / receitaLiquida) * 100 : null,
    receitaLiquida,
    sacolaMaterialAuxiliar: {
      divergenciaValor: somaDecimal("valorAjuste", itensSacola),
      totalItens: itensSacola.length,
    },
    resto: {
      divergenciaValor: somaDecimal("valorAjuste", itensResto),
      totalItens: itensResto.length,
    },
  };
}

export type PontoHistoricoDivergencia = {
  cicloId: string;
  dataFim: Date;
  tipoInventario: "CICLICO" | "COMPLETO";
  divergenciaValor: number;
  percentualSobreEstoque: number | null;
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
    });
  }
  return pontos;
}
