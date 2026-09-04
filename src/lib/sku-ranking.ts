import { prisma } from "@/lib/prisma";
import { getDivergenciasCruzadas } from "@/lib/cruzamento";

export type LinhaRankingItem = {
  codigoProduto: string;
  descricaoProduto: string;
  ocorrenciasDivergenciaInventario: number;
  ocorrenciasDemonstrador: number;
  ocorrenciasBrinde: number;
  ocorrenciasPerdaRoubo: number;
  ocorrenciasCruzamentoSuspeito: number;
  peso: number;
};

/**
 * Item 8.1: visão transversal do mesmo SKU em todos os módulos ao mesmo
 * tempo, pra distinguir item estruturalmente mal controlado (ex: sempre
 * usado como demonstrador e nunca baixado certo) de divergência real de
 * estoque. "Peso" = soma simples das ocorrências em cada categoria.
 *
 * Não inclui Defeitos: o cadastro de Defeito é por nota fiscal (sem detalhe
 * de item por SKU), então não dá pra contar ocorrência por produto ainda.
 */
export async function getRankingItens(): Promise<LinhaRankingItem[]> {
  const [divergenciasInventario, requisicoes, cruzamentos] = await Promise.all([
    prisma.itemInventario.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } }, NOT: { ajuste: 0 } },
      select: { codigoProduto: true, descricaoProduto: true },
    }),
    prisma.itemRequisicao.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: { codigoProduto: true, descricaoProduto: true, motivoCodigo: true },
    }),
    getDivergenciasCruzadas(),
  ]);

  const linhas = new Map<string, LinhaRankingItem>();

  const getOuCriar = (codigo: string, descricao: string) => {
    let linha = linhas.get(codigo);
    if (!linha) {
      linha = {
        codigoProduto: codigo,
        descricaoProduto: descricao,
        ocorrenciasDivergenciaInventario: 0,
        ocorrenciasDemonstrador: 0,
        ocorrenciasBrinde: 0,
        ocorrenciasPerdaRoubo: 0,
        ocorrenciasCruzamentoSuspeito: 0,
        peso: 0,
      };
      linhas.set(codigo, linha);
    }
    return linha;
  };

  for (const d of divergenciasInventario) {
    getOuCriar(d.codigoProduto, d.descricaoProduto).ocorrenciasDivergenciaInventario++;
  }

  for (const r of requisicoes) {
    const motivo = r.motivoCodigo.toUpperCase();
    const linha = getOuCriar(r.codigoProduto, r.descricaoProduto);
    if (motivo.includes("DEMONSTRADOR")) linha.ocorrenciasDemonstrador++;
    if (motivo.includes("BRINDE")) linha.ocorrenciasBrinde++;
    if (motivo.includes("PERDA") || motivo.includes("ROUBO")) linha.ocorrenciasPerdaRoubo++;
  }

  for (const c of cruzamentos) {
    getOuCriar(c.codigoProduto, c.descricaoProduto).ocorrenciasCruzamentoSuspeito++;
  }

  for (const linha of linhas.values()) {
    linha.peso =
      linha.ocorrenciasDivergenciaInventario +
      linha.ocorrenciasDemonstrador +
      linha.ocorrenciasBrinde +
      linha.ocorrenciasPerdaRoubo +
      linha.ocorrenciasCruzamentoSuspeito * 2; // cruzamento pesa mais - já é uma suspeita concreta
  }

  return Array.from(linhas.values())
    .filter((l) => l.peso > 0)
    .sort((a, b) => b.peso - a.peso);
}
