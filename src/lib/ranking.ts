import { prisma } from "@/lib/prisma";
import { calcularDivergencia } from "@/lib/divergencia";
import { lojasVisiveisWhere } from "@/lib/access";
import type { PerfilAcesso } from "@/generated/prisma/client";

export type LinhaRanking = {
  lojaId: string;
  pdv: number;
  nome: string;
  tipoLoja: string;
  regiaoNome: string | null;
  cicloId: string;
  dataFim: Date;
  divergenciaValor: number;
  percentualSobreEstoque: number | null;
  metaPercentual: number | null;
  acimaDaMeta: boolean;
  tendencia: "MELHOROU" | "PIOROU" | "ESTAVEL" | "SEM_HISTORICO";
};

/**
 * Item 3.1: ranking entre lojas por divergência, usando o ciclo fechado mais
 * recente de cada uma. "Tendência" compara com o ciclo fechado anterior da
 * mesma loja.
 */
export async function getRankingLojas(user: { id: string; perfil: PerfilAcesso }): Promise<LinhaRanking[]> {
  const lojas = await prisma.loja.findMany({
    where: { ativa: true, tipoLoja: { in: ["VAREJO", "REVENDA"] }, ...lojasVisiveisWhere(user) },
    include: { regiao: true },
  });

  const linhas: LinhaRanking[] = [];

  for (const loja of lojas) {
    const ultimosCiclos = await prisma.ciclo.findMany({
      where: { lojaId: loja.id, status: "FECHADO" },
      orderBy: { dataFim: "desc" },
      take: 2,
    });
    const [atual, anterior] = ultimosCiclos;
    if (!atual) continue;

    const dAtual = await calcularDivergencia(atual.id);
    if (dAtual.totalItens === 0) continue;

    let tendencia: LinhaRanking["tendencia"] = "SEM_HISTORICO";
    if (anterior) {
      const dAnterior = await calcularDivergencia(anterior.id);
      if (dAnterior.totalItens > 0 && dAtual.percentualSobreEstoque !== null && dAnterior.percentualSobreEstoque !== null) {
        const diferenca = dAtual.percentualSobreEstoque - dAnterior.percentualSobreEstoque;
        tendencia = diferenca < -0.01 ? "MELHOROU" : diferenca > 0.01 ? "PIOROU" : "ESTAVEL";
      }
    }

    const metaPercentual = loja.metaDivergenciaPercentual ? Number(loja.metaDivergenciaPercentual) : null;
    const metaValor = loja.metaDivergenciaValor ? Number(loja.metaDivergenciaValor) : null;
    const acimaDaMeta =
      (metaPercentual !== null &&
        dAtual.percentualSobreEstoque !== null &&
        dAtual.percentualSobreEstoque > metaPercentual) ||
      (metaValor !== null && Math.abs(dAtual.divergenciaValor) > metaValor);

    linhas.push({
      lojaId: loja.id,
      pdv: loja.pdv,
      nome: loja.nome,
      tipoLoja: loja.tipoLoja,
      regiaoNome: loja.regiao?.nome ?? null,
      cicloId: atual.id,
      dataFim: atual.dataFim,
      divergenciaValor: dAtual.divergenciaValor,
      percentualSobreEstoque: dAtual.percentualSobreEstoque,
      metaPercentual,
      acimaDaMeta,
      tendencia,
    });
  }

  return linhas.sort((a, b) => (b.percentualSobreEstoque ?? 0) - (a.percentualSobreEstoque ?? 0));
}
