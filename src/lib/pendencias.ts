import { prisma } from "@/lib/prisma";

const EPSILON = 0.01;

export type TransferenciaPendente = {
  numeroDocumento: string;
  codigoProduto: string;
  descricaoProduto: string;
  quantidade: number;
  loja: { id: string; pdv: number; nome: string };
  contraparteNome: string;
  dataEmissao: Date;
  diasPendente: number;
};

/**
 * Item pedido pelo usuário em 2026-09-04: cruza saídas de Transferência
 * contra entradas, pra achar o que já saiu de uma loja mas ainda não foi
 * registrado como recebido em nenhuma outra - antes mesmo de esperar o
 * próximo inventário revelar a divergência (o que o Cruzamento já faz).
 * Aqui a chave é exata (mesma NF + mesmo produto), já que a NF identifica
 * a movimentação com precisão - não precisa de "período de maturação".
 */
export async function getTransferenciasPendentes(): Promise<TransferenciaPendente[]> {
  const [saidas, entradas] = await Promise.all([
    prisma.itemTransferencia.findMany({
      where: { direcao: "SAIDA", arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        numeroDocumento: true,
        codigoProduto: true,
        descricaoProduto: true,
        quantidade: true,
        contraparteNome: true,
        dataEmissao: true,
        arquivo: { select: { ciclo: { select: { loja: { select: { id: true, pdv: true, nome: true } } } } } },
      },
      orderBy: { dataEmissao: "desc" },
      take: 1000,
    }),
    prisma.itemTransferencia.findMany({
      where: { direcao: "ENTRADA", arquivo: { ciclo: { status: "FECHADO" } } },
      select: { numeroDocumento: true, codigoProduto: true },
      take: 5000,
    }),
  ]);

  const chavesRecebidas = new Set(entradas.map((e) => `${e.numeroDocumento}::${e.codigoProduto}`));
  const hoje = new Date();

  return saidas
    .filter((s) => !chavesRecebidas.has(`${s.numeroDocumento}::${s.codigoProduto}`))
    .map((s) => ({
      numeroDocumento: s.numeroDocumento,
      codigoProduto: s.codigoProduto,
      descricaoProduto: s.descricaoProduto,
      quantidade: Number(s.quantidade),
      loja: s.arquivo.ciclo.loja,
      contraparteNome: s.contraparteNome,
      dataEmissao: s.dataEmissao,
      diasPendente: Math.floor((hoje.getTime() - s.dataEmissao.getTime()) / 86400000),
    }))
    .sort((a, b) => b.diasPendente - a.diasPendente);
}

type AjusteBruto = {
  id: string;
  lojaId: string;
  lojaNome: string;
  lojaPdv: number;
  cicloId: string;
  dataInicio: Date;
  dataFim: Date;
  dataMovimento: Date;
  codigoProduto: string;
  descricaoProduto: string;
  quantidade: number;
  direcao: "ENTRADA" | "SAIDA";
};

export type AjustePendente = {
  codigoProduto: string;
  descricaoProduto: string;
  quantidade: number;
  loja: { id: string; pdv: number; nome: string };
  direcao: "ENTRADA" | "SAIDA";
  dataMovimento: Date;
};

/**
 * Ajuste não tem NF nem loja de destino - só produto/quantidade/data. A
 * regra combinada com o usuário: procura par (saída numa loja, entrada em
 * outra) por produto+quantidade+período, igual ao Cruzamento; um item SEM
 * par só é considerado "pendência confirmada" depois que a PRÓPRIA loja já
 * fechou um ciclo posterior a esse ajuste (ou seja, já teve tempo de sobra
 * pra um item correspondente aparecer em algum lugar) - antes disso, fica
 * em "aguardando", não é uma pendência de verdade ainda.
 */
export async function getAjustesPendentes(): Promise<AjustePendente[]> {
  const [ajustes, ciclosFechados] = await Promise.all([
    prisma.itemAjuste.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        id: true,
        direcao: true,
        dataMovimento: true,
        codigoProduto: true,
        descricaoProduto: true,
        quantidade: true,
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
      take: 2000,
    }),
    prisma.ciclo.findMany({
      where: { status: "FECHADO" },
      select: { lojaId: true, dataInicio: true },
    }),
  ]);

  const brutos: AjusteBruto[] = ajustes.map((a) => ({
    id: a.id,
    lojaId: a.arquivo.ciclo.loja.id,
    lojaNome: a.arquivo.ciclo.loja.nome,
    lojaPdv: a.arquivo.ciclo.loja.pdv,
    cicloId: a.arquivo.ciclo.id,
    dataInicio: a.arquivo.ciclo.dataInicio,
    dataFim: a.arquivo.ciclo.dataFim,
    dataMovimento: a.dataMovimento,
    codigoProduto: a.codigoProduto,
    descricaoProduto: a.descricaoProduto,
    quantidade: Number(a.quantidade),
    direcao: a.direcao,
  }));

  // pra cada loja, o dataInicio do ciclo fechado mais recente - usado pra
  // saber se "já deu tempo" de um ajuste sem par aparecer em outro lugar.
  const proximoCicloFechadoPorLoja = new Map<string, Date[]>();
  for (const c of ciclosFechados) {
    const lista = proximoCicloFechadoPorLoja.get(c.lojaId) ?? [];
    lista.push(c.dataInicio);
    proximoCicloFechadoPorLoja.set(c.lojaId, lista);
  }

  function jaMaturou(a: AjusteBruto): boolean {
    const datas = proximoCicloFechadoPorLoja.get(a.lojaId) ?? [];
    return datas.some((d) => d > a.dataFim);
  }

  function periodosSeSobrepoe(a: AjusteBruto, b: AjusteBruto) {
    return a.dataInicio <= b.dataFim && a.dataFim >= b.dataInicio;
  }

  const porProduto = new Map<string, AjusteBruto[]>();
  for (const a of brutos) {
    const lista = porProduto.get(a.codigoProduto) ?? [];
    lista.push(a);
    porProduto.set(a.codigoProduto, lista);
  }

  const idsComPar = new Set<string>();
  for (const lista of porProduto.values()) {
    const saidas = lista.filter((a) => a.direcao === "SAIDA");
    const entradas = lista.filter((a) => a.direcao === "ENTRADA");
    for (const s of saidas) {
      for (const e of entradas) {
        if (s.lojaId === e.lojaId) continue;
        if (Math.abs(s.quantidade - e.quantidade) > EPSILON) continue;
        if (!periodosSeSobrepoe(s, e)) continue;
        idsComPar.add(s.id);
        idsComPar.add(e.id);
      }
    }
  }

  return brutos
    .filter((a) => !idsComPar.has(a.id) && jaMaturou(a))
    .map((a) => ({
      codigoProduto: a.codigoProduto,
      descricaoProduto: a.descricaoProduto,
      quantidade: a.quantidade,
      loja: { id: a.lojaId, pdv: a.lojaPdv, nome: a.lojaNome },
      direcao: a.direcao,
      dataMovimento: a.dataMovimento,
    }))
    .sort((a, b) => b.dataMovimento.getTime() - a.dataMovimento.getTime());
}
