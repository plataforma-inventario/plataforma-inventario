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

// Lojas sem grupo fixo (revenda e Centro de Distribuição - o cronograma
// fixo acima vale só pras 26 lojas de varejo, ver docs/BRIEFING.md) usam
// cadência corrida em dias a partir do último fechamento, em vez de mês
// fixo compartilhado com outras lojas (pedido pelo usuário em 2026-09-05:
// "de 90 em 90 dias", não um mês fixo do calendário).
const DIAS_POR_CICLO_SEM_GRUPO: Record<string, number> = {
  BIMESTRAL: 60,
  TRIMESTRAL: 90,
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
  // null só pras lojas de cadência corrida (dataEsperadaCorrida abaixo) -
  // essas não têm um "mês fixo" pra estimar, só uma data exata.
  mesAnoEsperado: { mes: number; ano: number } | null;
  // Preenchido só pras lojas sem grupo fixo (revenda/CD): data exata
  // esperada (último fechamento + N dias), em vez de um mês inteiro. Fica
  // null se a loja ainda não teve nenhum lançamento fechado (sem âncora
  // não dá pra estimar, então também não marca atraso).
  dataEsperadaCorrida: Date | null;
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
    const ultimoCiclo = loja.ciclos[0] ?? null;

    if (!mesesValidos) {
      // Loja sem grupo fixo (revenda/CD): cadência corrida em dias em vez
      // de mês fixo. Sem nenhum lançamento fechado ainda não tem âncora
      // pra calcular uma data - não estima e não marca atraso.
      const dias = DIAS_POR_CICLO_SEM_GRUPO[loja.cicloContagem!];
      let dataEsperadaCorrida: Date | null = null;
      let atrasadaCorrida = false;
      if (dias && ultimoCiclo) {
        dataEsperadaCorrida = new Date(ultimoCiclo.dataFim);
        dataEsperadaCorrida.setDate(dataEsperadaCorrida.getDate() + dias);
        atrasadaCorrida = hoje > dataEsperadaCorrida;
      }
      resultado.push({
        lojaId: loja.id,
        pdv: loja.pdv,
        nome: loja.nome,
        grupo,
        ultimoCicloDataFim: ultimoCiclo?.dataFim ?? null,
        mesAnoEsperado: null,
        dataEsperadaCorrida,
        dataAgendada: null,
        atrasada: atrasadaCorrida,
      });
      continue;
    }

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
      dataEsperadaCorrida: null,
      dataAgendada,
      atrasada,
    });
  }

  // Normaliza mesAnoEsperado/dataEsperadaCorrida numa única data comparável,
  // pra ordenar os dois tipos de loja (grupo fixo e cadência corrida) juntos.
  const dataComparavel = (l: LojaCalendario): Date =>
    l.dataEsperadaCorrida ?? (l.mesAnoEsperado ? new Date(l.mesAnoEsperado.ano, l.mesAnoEsperado.mes - 1, 1) : hoje);

  return resultado.sort((a, b) => {
    if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
    return dataComparavel(a).getTime() - dataComparavel(b).getTime();
  });
}
