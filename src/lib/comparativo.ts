import { prisma } from "@/lib/prisma";
import { lojasVisiveisWhere } from "@/lib/access";
import type { PerfilAcesso, TipoLoja } from "@/generated/prisma/client";

type Usuario = { id: string; perfil: PerfilAcesso };

export type FiltrosComparativo = {
  mes?: number;
  ano?: number;
  dataInicio?: Date;
  dataFim?: Date;
  tipoLoja?: TipoLoja;
};

export type LinhaComparativo = {
  loja: { id: string; pdv: number; nome: string; tipoLoja: TipoLoja };
  faturamento: number;
  requisicaoTotal: number;
  // null quando não há faturamento lançado ainda pra essa loja no período -
  // não dá pra calcular percentual sem o denominador.
  percentualSobreFaturamento: number | null;
};

function filtroPeriodo(filtros: FiltrosComparativo) {
  if (filtros.dataInicio || filtros.dataFim) {
    return {
      ...(filtros.dataInicio ? { gte: filtros.dataInicio } : {}),
      ...(filtros.dataFim
        ? {
            lte: new Date(
              filtros.dataFim.getFullYear(),
              filtros.dataFim.getMonth(),
              filtros.dataFim.getDate(),
              23,
              59,
              59
            ),
          }
        : {}),
    };
  }
  if (!filtros.mes && !filtros.ano) return undefined;
  // Mesmo ajuste de relatorios.ts (2026-09-05): só mês, sem ano, não pode
  // ser ignorado - assume o ano atual quando só o mês é escolhido.
  const anoEfetivo = filtros.ano ?? new Date().getFullYear();
  const inicio = new Date(anoEfetivo, filtros.mes ? filtros.mes - 1 : 0, 1);
  const fim = filtros.mes ? new Date(anoEfetivo, filtros.mes, 1) : new Date(anoEfetivo + 1, 0, 1);
  return { gte: inicio, lt: fim };
}

/**
 * Pedido pelo usuário em 2026-09-04: comparar lojas com faturamento
 * parecido pra ver se as requisições (demonstrador/brinde/perda-roubo/etc.)
 * estão proporcionalmente diferentes entre elas - um jeito de flagrar loja
 * gastando mais que suas "pares" em requisição sem justificativa aparente.
 *
 * Exceção combinada com o usuário: esta tela mostra PDV/nome da loja
 * (diferente do resto do módulo Requisições, que nunca mostra PDV - item 6
 * do briefing) porque é uma ferramenta de análise interna do Auditor, não
 * o relatório padrão de requisições.
 */
export async function getComparativoFaturamentoRequisicao(
  user: Usuario,
  filtros: FiltrosComparativo = {}
): Promise<LinhaComparativo[]> {
  const lojas = await prisma.loja.findMany({
    where: { ...lojasVisiveisWhere(user), ...(filtros.tipoLoja ? { tipoLoja: filtros.tipoLoja } : {}) },
    select: { id: true, pdv: true, nome: true, tipoLoja: true },
  });
  const ids = lojas.map((l) => l.id);
  const periodo = filtroPeriodo(filtros);

  const [faturamentos, requisicoes] = await Promise.all([
    prisma.faturamento.findMany({
      where: { arquivo: { ciclo: { lojaId: { in: ids }, dataFim: periodo, status: "FECHADO" } } },
      select: { receitaLiquida: true, arquivo: { select: { ciclo: { select: { lojaId: true } } } } },
    }),
    prisma.itemRequisicao.findMany({
      where: { dataRequisicao: periodo, arquivo: { ciclo: { lojaId: { in: ids } } } },
      select: { custoTotal: true, arquivo: { select: { ciclo: { select: { lojaId: true } } } } },
    }),
  ]);

  const faturamentoPorLoja = new Map<string, number>();
  for (const f of faturamentos) {
    const lojaId = f.arquivo.ciclo.lojaId;
    faturamentoPorLoja.set(lojaId, (faturamentoPorLoja.get(lojaId) ?? 0) + Number(f.receitaLiquida));
  }

  const requisicaoPorLoja = new Map<string, number>();
  for (const r of requisicoes) {
    const lojaId = r.arquivo.ciclo.lojaId;
    requisicaoPorLoja.set(lojaId, (requisicaoPorLoja.get(lojaId) ?? 0) + Number(r.custoTotal));
  }

  const linhas: LinhaComparativo[] = lojas
    .map((loja) => {
      const faturamento = faturamentoPorLoja.get(loja.id) ?? 0;
      const requisicaoTotal = requisicaoPorLoja.get(loja.id) ?? 0;
      return {
        loja,
        faturamento,
        requisicaoTotal,
        percentualSobreFaturamento: faturamento > 0 ? (requisicaoTotal / faturamento) * 100 : null,
      };
    })
    .filter((l) => l.faturamento > 0 || l.requisicaoTotal > 0);

  return linhas.sort((a, b) => b.faturamento - a.faturamento);
}
