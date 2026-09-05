import { prisma } from "@/lib/prisma";
import { calcularDivergencia } from "@/lib/divergencia";
import { getRankingLojas } from "@/lib/ranking";
import { getDivergenciasCruzadas } from "@/lib/cruzamento";
import { lojasVisiveisWhere } from "@/lib/access";
import type { PerfilAcesso } from "@/generated/prisma/client";

type Usuario = { id: string; perfil: PerfilAcesso };

const NOME_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type PontoEvolucaoGrupo = {
  mes: string; // "2026-01", para ordenação
  rotulo: string; // "jan/2026", para exibição
  percentualMedio: number;
  quantidadeLojas: number;
};

/**
 * Item 9 do briefing (Dashboards): evolução da divergência do GRUPO (todas
 * as lojas visíveis ao usuário) ao longo do tempo — uma versão "por grupo"
 * de getHistoricoDivergencia (divergencia.ts), que é por loja. Agrega por
 * mês do dataFim de cada ciclo FECHADO e tira a MÉDIA de
 * percentualSobreFaturamento entre as lojas que fecharam lançamento naquele
 * mês (média, não soma, porque faturamento varia muito de loja pra loja —
 * mesma razão pela qual o ranking usa % sobre faturamento como base de
 * comparação, ver comentário em ranking.ts).
 */
export async function getEvolucaoDivergenciaGrupo(user: Usuario): Promise<PontoEvolucaoGrupo[]> {
  // Centro de Distribuição (tipoLoja LOGISTICA) fecha inventário normalmente,
  // então entra na evolução do grupo igual às lojas de varejo/revenda (ver
  // mesmo ajuste em ranking.ts, 2026-09-05).
  const lojas = await prisma.loja.findMany({
    where: { ativa: true, ...lojasVisiveisWhere(user) },
    select: { id: true },
  });
  if (lojas.length === 0) return [];

  const ciclos = await prisma.ciclo.findMany({
    where: { status: "FECHADO", lojaId: { in: lojas.map((l) => l.id) } },
    orderBy: { dataFim: "asc" },
    select: { id: true, dataFim: true },
  });

  const porMes = new Map<string, { soma: number; quantidade: number }>();
  for (const ciclo of ciclos) {
    const d = await calcularDivergencia(ciclo.id);
    if (d.totalItens === 0 || d.percentualSobreFaturamento === null) continue;
    const chave = `${ciclo.dataFim.getFullYear()}-${String(ciclo.dataFim.getMonth() + 1).padStart(2, "0")}`;
    const atual = porMes.get(chave) ?? { soma: 0, quantidade: 0 };
    atual.soma += d.percentualSobreFaturamento;
    atual.quantidade += 1;
    porMes.set(chave, atual);
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([mes, { soma, quantidade }]) => {
      const [ano, mesNum] = mes.split("-");
      return {
        mes,
        rotulo: `${NOME_MES[Number(mesNum) - 1]}/${ano}`,
        percentualMedio: soma / quantidade,
        quantidadeLojas: quantidade,
      };
    });
}

export type ComposicaoDivergenciaGrupo = {
  sacola: number;
  resto: number;
};

/**
 * Composição da divergência do grupo (sacola/material auxiliar vs. resto),
 * somando o valor absoluto das duas categorias no ciclo fechado mais
 * recente de cada loja — o MESMO conjunto de ciclos que getRankingLojas usa
 * (reaproveita a função em vez de re-derivar "ciclo mais recente por loja"
 * de outro jeito).
 */
export async function getComposicaoDivergenciaGrupo(user: Usuario): Promise<ComposicaoDivergenciaGrupo> {
  const linhas = await getRankingLojas(user);
  let sacola = 0;
  let resto = 0;
  for (const linha of linhas) {
    const d = await calcularDivergencia(linha.cicloId);
    sacola += Math.abs(d.sacolaMaterialAuxiliar.divergenciaValor);
    resto += Math.abs(d.resto.divergenciaValor);
  }
  return { sacola, resto };
}

export type CruzamentoPorConfianca = {
  confianca: "CONFIRMADA" | "SUSPEITA_NIVEL_2" | "SUSPEITA_NIVEL_1";
  quantidade: number;
};

/**
 * Contagem de divergências cruzadas em aberto por nível de confiança. Assim
 * como a tela /cruzamento (que usa a mesma getDivergenciasCruzadas), isso
 * cruza TODAS as lojas do sistema — não é filtrado por lojasVisiveisWhere
 * porque o próprio conceito de cruzamento envolve duas lojas ao mesmo tempo.
 * Por isso a página do dashboard só chama esta função para perfis que já
 * enxergam a tela /cruzamento (Auditor/Diretoria/Logística) — gerentes não.
 */
export async function getCruzamentosPorConfianca(): Promise<CruzamentoPorConfianca[]> {
  const cruzamentos = await getDivergenciasCruzadas();
  const contagem: Record<CruzamentoPorConfianca["confianca"], number> = {
    CONFIRMADA: 0,
    SUSPEITA_NIVEL_2: 0,
    SUSPEITA_NIVEL_1: 0,
  };
  for (const c of cruzamentos) contagem[c.confianca]++;
  return [
    { confianca: "CONFIRMADA", quantidade: contagem.CONFIRMADA },
    { confianca: "SUSPEITA_NIVEL_2", quantidade: contagem.SUSPEITA_NIVEL_2 },
    { confianca: "SUSPEITA_NIVEL_1", quantidade: contagem.SUSPEITA_NIVEL_1 },
  ];
}

export const CATEGORIAS_REQUISICAO = ["Demonstrador", "Brinde", "Perda/Roubo", "Premiação", "Outros"] as const;
export type CategoriaRequisicao = (typeof CATEGORIAS_REQUISICAO)[number];

export type RequisicaoPorCategoria = {
  categoria: CategoriaRequisicao;
  custoTotal: number;
};

/**
 * Requisições por categoria (agregação nova pro dashboard). Reaproveita a
 * MESMA categorização por palavra-chave já usada em sku-ranking.ts
 * (getRankingItens: "DEMONSTRADOR", "BRINDE", "PERDA"/"ROUBO" dentro de
 * motivoCodigo) e em relatorios.ts (getPremiacoes: motivoCodigo contendo
 * "PREMI") — não inventa categoria nem critério novo. Diferença: aqui cada
 * item cai em exatamente UMA categoria (pra poder somar custoTotal sem
 * contar duas vezes), com Premiação checada primeiro.
 */
export async function getRequisicoesPorCategoria(user: Usuario): Promise<RequisicaoPorCategoria[]> {
  const lojas = await prisma.loja.findMany({
    where: lojasVisiveisWhere(user),
    select: { id: true },
  });

  const itens = await prisma.itemRequisicao.findMany({
    where: {
      arquivo: { ciclo: { status: "FECHADO", lojaId: { in: lojas.map((l) => l.id) } } },
    },
    select: { motivoCodigo: true, custoTotal: true },
  });

  const totais: Record<CategoriaRequisicao, number> = {
    Demonstrador: 0,
    Brinde: 0,
    "Perda/Roubo": 0,
    Premiação: 0,
    Outros: 0,
  };

  for (const item of itens) {
    const motivo = item.motivoCodigo.toUpperCase();
    const custo = Number(item.custoTotal);
    if (motivo.includes("PREMI")) totais["Premiação"] += custo;
    else if (motivo.includes("DEMONSTRADOR")) totais["Demonstrador"] += custo;
    else if (motivo.includes("BRINDE")) totais["Brinde"] += custo;
    else if (motivo.includes("PERDA") || motivo.includes("ROUBO")) totais["Perda/Roubo"] += custo;
    else totais["Outros"] += custo;
  }

  return CATEGORIAS_REQUISICAO.map((categoria) => ({ categoria, custoTotal: totais[categoria] }));
}
