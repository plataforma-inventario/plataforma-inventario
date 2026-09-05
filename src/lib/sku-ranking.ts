import { prisma } from "@/lib/prisma";
import { getDivergenciasCruzadas } from "@/lib/cruzamento";

export type LinhaRankingItem = {
  codigoProduto: string;
  descricaoProduto: string;
  ocorrenciasDivergenciaInventario: number;
  // Pedido pelo usuário em 2026-09-05: separar quantas dessas ocorrências
  // foram sobra (ajuste > 0) vs. falta (ajuste < 0) - um item que sempre
  // falta é um padrão diferente de um que ora falta ora sobra em volume
  // parecido (mais consistente com troca de código/erro de lançamento do
  // que com furto, por exemplo).
  ocorrenciasSobra: number;
  ocorrenciasFalta: number;
  ocorrenciasDemonstrador: number;
  ocorrenciasBrinde: number;
  ocorrenciasPerdaRoubo: number;
  ocorrenciasDefeito: number;
  ocorrenciasCruzamentoSuspeito: number;
  peso: number;
};

/**
 * Item 8.1: visão transversal do mesmo SKU em todos os módulos ao mesmo
 * tempo, pra distinguir item estruturalmente mal controlado (ex: sempre
 * usado como demonstrador e nunca baixado certo) de divergência real de
 * estoque. "Peso" = soma simples das ocorrências em cada categoria.
 *
 * Defeito entrou em 2026-09-04, a pedido do usuário, depois que a
 * redesenho de Defeitos passou a guardar item por item (ItemDefeito) - antes
 * só existia o total por nota fiscal, sem detalhe de SKU.
 */
export async function getRankingItens(): Promise<LinhaRankingItem[]> {
  const [divergenciasInventario, requisicoes, defeitos, cruzamentos] = await Promise.all([
    prisma.itemInventario.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } }, NOT: { ajuste: 0 } },
      select: { codigoProduto: true, descricaoProduto: true, ajuste: true },
    }),
    prisma.itemRequisicao.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: { codigoProduto: true, descricaoProduto: true, motivoCodigo: true },
    }),
    prisma.itemDefeito.findMany({
      select: { codigoProduto: true, descricaoProduto: true },
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
        ocorrenciasSobra: 0,
        ocorrenciasFalta: 0,
        ocorrenciasDemonstrador: 0,
        ocorrenciasBrinde: 0,
        ocorrenciasPerdaRoubo: 0,
        ocorrenciasDefeito: 0,
        ocorrenciasCruzamentoSuspeito: 0,
        peso: 0,
      };
      linhas.set(codigo, linha);
    }
    return linha;
  };

  for (const d of divergenciasInventario) {
    const linha = getOuCriar(d.codigoProduto, d.descricaoProduto);
    linha.ocorrenciasDivergenciaInventario++;
    if (Number(d.ajuste) > 0) linha.ocorrenciasSobra++;
    else linha.ocorrenciasFalta++;
  }

  for (const r of requisicoes) {
    const motivo = r.motivoCodigo.toUpperCase();
    const linha = getOuCriar(r.codigoProduto, r.descricaoProduto);
    if (motivo.includes("DEMONSTRADOR")) linha.ocorrenciasDemonstrador++;
    if (motivo.includes("BRINDE")) linha.ocorrenciasBrinde++;
    if (motivo.includes("PERDA") || motivo.includes("ROUBO")) linha.ocorrenciasPerdaRoubo++;
  }

  for (const d of defeitos) {
    getOuCriar(d.codigoProduto, d.descricaoProduto).ocorrenciasDefeito++;
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
      linha.ocorrenciasDefeito +
      linha.ocorrenciasCruzamentoSuspeito * 2; // cruzamento pesa mais - já é uma suspeita concreta
  }

  return Array.from(linhas.values())
    .filter((l) => l.peso > 0)
    .sort((a, b) => b.peso - a.peso);
}
