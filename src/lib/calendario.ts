import { prisma } from "@/lib/prisma";

// Meses (1-12) em que cada subgrupo do calendário fixo de auditoria conta
// (ver docs/BRIEFING.md). Nenhum grupo inclui dezembro nem janeiro — o
// blackout do item 3.0 já está embutido nos dados reais, não precisa de
// regra especial pra dezembro.
const MESES_POR_GRUPO: Record<string, number[]> = {
  MENSAL: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  B1: [2, 4, 6, 8, 10],
  B2: [3, 5, 7, 9, 11],
  T1: [2, 5, 8],
  T2: [3, 6, 9],
  T3: [4, 7, 10],
};

// O cronograma fixo acima só passa a valer a partir deste ano (confirmado
// pelo usuário em 2026-09-04) - antes disso o controle era manual em
// planilha, então nenhuma loja deve ser cobrada/marcada como atrasada.
const ANO_INICIO_CRONOGRAMA = 2027;

export type LojaCalendario = {
  lojaId: string;
  pdv: number;
  nome: string;
  grupo: string; // "MENSAL" | "B1" | ... - chave de exibição
  ultimoCicloDataFim: Date | null;
  mesAnoEsperado: { mes: number; ano: number };
  // Dia exato já combinado (importado da agenda/Google Agenda), quando
  // existir - sobrepõe o mesAnoEsperado (que só sabe o mês) na exibição.
  dataAgendada: Date | null;
  atrasada: boolean;
};

function chaveGrupo(cicloContagem: string, grupoAuditoria: string | null): string {
  return cicloContagem === "MENSAL" ? "MENSAL" : (grupoAuditoria ?? cicloContagem);
}

function proximoMesAno(mesesValidos: number[], apósMes: number, apósAno: number) {
  const proximoNoMesmoAno = mesesValidos.find((m) => m > apósMes);
  if (proximoNoMesmoAno) return { mes: proximoNoMesmoAno, ano: apósAno };
  return { mes: mesesValidos[0], ano: apósAno + 1 };
}

/**
 * Item 10.1 (alerta de atraso) + 10.6 (calendário de visitas): calcula o
 * próximo mês esperado de inventário de cada loja com ciclo definido, e se
 * já passou desse mês sem um lançamento fechado, sinaliza atraso.
 */
export async function getCalendarioLojas(): Promise<LojaCalendario[]> {
  const lojas = await prisma.loja.findMany({
    where: { ativa: true, cicloContagem: { not: null } },
    include: {
      ciclos: {
        where: { status: "FECHADO" },
        orderBy: { dataFim: "desc" },
        take: 1,
      },
    },
  });

  const visitasAgendadas = await prisma.visitaAgendada.findMany({
    where: { lojaId: { in: lojas.map((l) => l.id) } },
  });
  const mapaVisitas = new Map(visitasAgendadas.map((v) => [`${v.lojaId}-${v.ano}-${v.mes}`, v]));

  const hoje = new Date();
  const resultado: LojaCalendario[] = [];

  for (const loja of lojas) {
    const grupo = chaveGrupo(loja.cicloContagem!, loja.grupoAuditoria);
    const mesesValidos = MESES_POR_GRUPO[grupo];
    if (!mesesValidos) continue;

    const ultimoCiclo = loja.ciclos[0] ?? null;

    let esperado: { mes: number; ano: number };
    if (ultimoCiclo) {
      esperado = proximoMesAno(mesesValidos, ultimoCiclo.dataFim.getMonth() + 1, ultimoCiclo.dataFim.getFullYear());
    } else if (hoje.getFullYear() < ANO_INICIO_CRONOGRAMA) {
      // cronograma novo ainda nao comecou: primeiro mes valido do ano em
      // que ele passa a valer, nunca um mes ja passado do ano atual.
      esperado = { mes: mesesValidos[0], ano: ANO_INICIO_CRONOGRAMA };
    } else {
      // cronograma ja em vigor, sem ciclo ainda: usa o mes valido mais
      // recente ate hoje (o mais proximo "vencido"), caindo pro ano
      // anterior se nenhum mes valido deste ano ja passou.
      const mesAtual = hoje.getMonth() + 1;
      const maisRecenteEsteAno = [...mesesValidos].reverse().find((m) => m <= mesAtual);
      esperado = maisRecenteEsteAno
        ? { mes: maisRecenteEsteAno, ano: hoje.getFullYear() }
        : { mes: mesesValidos[mesesValidos.length - 1], ano: hoje.getFullYear() - 1 };
    }

    const visita = mapaVisitas.get(`${loja.id}-${esperado.ano}-${esperado.mes}`) ?? null;
    const dataAgendada = visita?.dataAgendada ?? null;

    let atrasada: boolean;
    if (dataAgendada) {
      // dia exato ja combinado: atraso e comparado contra esse dia, nao
      // contra o fim do mes.
      const fimDoDiaAgendado = new Date(
        dataAgendada.getFullYear(),
        dataAgendada.getMonth(),
        dataAgendada.getDate(),
        23,
        59,
        59
      );
      atrasada = hoje > fimDoDiaAgendado;
    } else {
      // fim do mes esperado, pra saber se ja venceu - so conta atraso
      // depois que o cronograma novo comecar de fato.
      const fimDoMesEsperado = new Date(esperado.ano, esperado.mes, 0, 23, 59, 59);
      atrasada = hoje >= new Date(ANO_INICIO_CRONOGRAMA, 0, 1) && hoje > fimDoMesEsperado;
    }

    resultado.push({
      lojaId: loja.id,
      pdv: loja.pdv,
      nome: loja.nome,
      grupo,
      ultimoCicloDataFim: ultimoCiclo?.dataFim ?? null,
      mesAnoEsperado: esperado,
      dataAgendada,
      atrasada,
    });
  }

  return resultado.sort((a, b) => {
    if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
    return (
      a.mesAnoEsperado.ano - b.mesAnoEsperado.ano || a.mesAnoEsperado.mes - b.mesAnoEsperado.mes
    );
  });
}
