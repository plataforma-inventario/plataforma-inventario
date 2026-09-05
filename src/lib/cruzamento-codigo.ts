import { prisma } from "@/lib/prisma";

const EPSILON = 0.01;

export type DivergenciaCodigoCruzado = {
  grupoDescricao: string;
  codigoFalta: {
    codigo: string;
    descricao: string;
    lojaId: string;
    lojaPdv: number;
    lojaNome: string;
    cicloId: string;
    quantidade: number;
  };
  codigoSobra: {
    codigo: string;
    descricao: string;
    lojaId: string;
    lojaPdv: number;
    lojaNome: string;
    cicloId: string;
    quantidade: number;
  };
  // true = mesmo cenário do exemplo do usuário (entrada de transferência
  // registrada sob o código errado, revelada no inventário seguinte da MESMA
  // loja) - mais comum/mais confiável. false = os dois lados aconteceram em
  // lojas diferentes (ex: uma venda registrada sob o código trocado).
  mesmaLoja: boolean;
};

type Residual = {
  lojaId: string;
  lojaNome: string;
  lojaPdv: number;
  cicloId: string;
  dataInicio: Date;
  dataFim: Date;
  codigoProduto: string;
  descricaoProduto: string;
  residual: number;
};

// Copiado de cruzamento.ts (mesmo critério de "período em aberto que se
// cruza"). Usado aqui em vez de exigir "mesmo ciclo": como cicloId pertence a
// uma única loja, restringir a mesmo ciclo tornaria `mesmaLoja` sempre
// verdadeiro e nunca detectaria o caso entre lojas diferentes (ex: venda
// registrada sob o código trocado). Sobreposição de período cobre os dois
// casos com a mesma lógica já usada no cruzamento por código igual.
function periodosSeSobrepoe(
  a: { dataInicio: Date; dataFim: Date },
  b: { dataInicio: Date; dataFim: Date }
) {
  return a.dataInicio <= b.dataFim && a.dataFim >= b.dataInicio;
}

// Normaliza a descrição do produto só o suficiente pra comparar strings
// idênticas ignorando caixa e espaçamento (trim + maiúsculas + espaços
// duplicados colapsados) - não é um fuzzy match/distância de edição, só
// evita falso-negativo por formatação inconsistente entre relatórios.
function normalizarDescricao(descricao: string): string {
  return descricao.trim().toUpperCase().replace(/\s+/g, " ");
}

// Union-Find simples (com compressão de caminho) pra mesclar grupos manuais
// (GrupoCodigoEquivalente) e grupos automáticos (mesma descrição normalizada)
// que compartilhem algum código em comum, transitivamente.
class UniaoConjuntos {
  private pai = new Map<string, string>();

  private encontrar(x: string): string {
    if (!this.pai.has(x)) this.pai.set(x, x);
    let raiz = x;
    while (this.pai.get(raiz) !== raiz) raiz = this.pai.get(raiz)!;
    let atual = x;
    while (this.pai.get(atual) !== raiz) {
      const proximo = this.pai.get(atual)!;
      this.pai.set(atual, raiz);
      atual = proximo;
    }
    return raiz;
  }

  unir(a: string, b: string) {
    const raizA = this.encontrar(a);
    const raizB = this.encontrar(b);
    if (raizA !== raizB) this.pai.set(raizA, raizB);
  }

  raizDe(x: string): string {
    return this.encontrar(x);
  }
}

/**
 * Detecta o cenário descrito pelo usuário (2026-09-05): o MESMO produto
 * físico cadastrado sob códigos DIFERENTES (código legado/duplicado do
 * cadastro da própria O Boticário, ou um erro de digitação numa entrada de
 * transferência/ajuste/venda que registra a quantidade sob o código errado).
 * Isso faz a divergência de inventário aparecer em dois códigos diferentes
 * com sinal oposto e magnitude igual - hoje INVISÍVEL pro
 * getDivergenciasCruzadas() de cruzamento.ts, que agrupa residuais por
 * codigoProduto exato (48281 e 88082 nunca se cruzam lá, mesmo sendo o
 * mesmo item). Esta é uma dimensão de detecção ADICIONAL - não altera nem
 * substitui a lógica existente.
 */
export async function getDivergenciasCodigoCruzado(): Promise<DivergenciaCodigoCruzado[]> {
  const [gruposManuais, inventarios, transferencias, ajustes] = await Promise.all([
    prisma.grupoCodigoEquivalente.findMany({
      include: { codigos: true },
    }),
    prisma.itemInventario.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        descricaoProduto: true,
        ajuste: true,
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
    }),
    prisma.itemTransferencia.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        direcao: true,
        quantidade: true,
        arquivo: { select: { ciclo: { select: { id: true } } } },
      },
    }),
    prisma.itemAjuste.findMany({
      where: { arquivo: { ciclo: { status: "FECHADO" } } },
      select: {
        codigoProduto: true,
        direcao: true,
        quantidade: true,
        arquivo: { select: { ciclo: { select: { id: true } } } },
      },
    }),
  ]);

  const uniao = new UniaoConjuntos();

  // último rótulo de grupo manual conhecido por código (pra nomear o grupo
  // mesclado de forma amigável quando ele tiver origem manual)
  const grupoDescricaoPorCodigo = new Map<string, string>();
  for (const grupo of gruposManuais) {
    const codigos = grupo.codigos.map((c) => c.codigoProduto);
    for (const codigo of codigos) grupoDescricaoPorCodigo.set(codigo, grupo.descricao);
    for (let i = 1; i < codigos.length; i++) uniao.unir(codigos[0], codigos[i]);
  }

  // última descrição de inventário conhecida por código (fallback pra quando
  // o grupo mesclado não tiver origem manual)
  const descricaoInventarioPorCodigo = new Map<string, string>();
  const codigosPorDescricaoNormalizada = new Map<string, Set<string>>();
  for (const inv of inventarios) {
    descricaoInventarioPorCodigo.set(inv.codigoProduto, inv.descricaoProduto);
    const chave = normalizarDescricao(inv.descricaoProduto);
    const set = codigosPorDescricaoNormalizada.get(chave) ?? new Set<string>();
    set.add(inv.codigoProduto);
    codigosPorDescricaoNormalizada.set(chave, set);
  }
  for (const codigosSet of codigosPorDescricaoNormalizada.values()) {
    if (codigosSet.size < 2) continue; // só interessa quando 2+ códigos distintos compartilham a descrição
    const codigos = [...codigosSet];
    for (let i = 1; i < codigos.length; i++) uniao.unir(codigos[0], codigos[i]);
  }

  // agrupa todos os códigos que passaram pela união (manuais + automáticos) pela raiz final
  const todosOsCodigos = new Set<string>();
  for (const grupo of gruposManuais) for (const c of grupo.codigos) todosOsCodigos.add(c.codigoProduto);
  for (const set of codigosPorDescricaoNormalizada.values()) for (const c of set) todosOsCodigos.add(c);

  const codigosPorRaiz = new Map<string, Set<string>>();
  for (const codigo of todosOsCodigos) {
    const raiz = uniao.raizDe(codigo);
    const set = codigosPorRaiz.get(raiz) ?? new Set<string>();
    set.add(codigo);
    codigosPorRaiz.set(raiz, set);
  }

  // só grupos mesclados com 2+ códigos distintos importam (grupo com 1 código só não cruza nada)
  const gruposFinais = new Map<string, Set<string>>();
  for (const [raiz, set] of codigosPorRaiz) {
    if (set.size >= 2) gruposFinais.set(raiz, set);
  }
  if (gruposFinais.size === 0) return [];

  const descricaoPorRaiz = new Map<string, string>();
  for (const [raiz, set] of gruposFinais) {
    const codigosDoGrupo = [...set];
    const comOrigemManual = codigosDoGrupo.find((c) => grupoDescricaoPorCodigo.has(c));
    descricaoPorRaiz.set(
      raiz,
      comOrigemManual
        ? grupoDescricaoPorCodigo.get(comOrigemManual)!
        : (descricaoInventarioPorCodigo.get(codigosDoGrupo[0]) ?? codigosDoGrupo.join(" / "))
    );
  }

  const codigosRelevantes = new Set<string>();
  for (const set of gruposFinais.values()) for (const c of set) codigosRelevantes.add(c);

  // net explicado (entrada - saida) por (cicloId, codigoProduto) - mesmo
  // cálculo de cruzamento.ts
  const explicadoPorCicloProduto = new Map<string, number>();
  for (const t of [...transferencias, ...ajustes]) {
    const chave = `${t.arquivo.ciclo.id}::${t.codigoProduto}`;
    const sinal = t.direcao === "ENTRADA" ? 1 : -1;
    explicadoPorCicloProduto.set(
      chave,
      (explicadoPorCicloProduto.get(chave) ?? 0) + sinal * Number(t.quantidade)
    );
  }

  // residual por (loja+ciclo+código), só pros códigos que pertencem a algum
  // grupo mesclado (o resto não pode cruzar com nada aqui, não precisa
  // computar)
  const residuos: Residual[] = [];
  for (const inv of inventarios) {
    if (!codigosRelevantes.has(inv.codigoProduto)) continue;
    const chave = `${inv.arquivo.ciclo.id}::${inv.codigoProduto}`;
    const explicado = explicadoPorCicloProduto.get(chave) ?? 0;
    const residual = Number(inv.ajuste) - explicado;
    if (Math.abs(residual) < EPSILON) continue;

    residuos.push({
      lojaId: inv.arquivo.ciclo.loja.id,
      lojaNome: inv.arquivo.ciclo.loja.nome,
      lojaPdv: inv.arquivo.ciclo.loja.pdv,
      cicloId: inv.arquivo.ciclo.id,
      dataInicio: inv.arquivo.ciclo.dataInicio,
      dataFim: inv.arquivo.ciclo.dataFim,
      codigoProduto: inv.codigoProduto,
      descricaoProduto: inv.descricaoProduto,
      residual,
    });
  }

  const residuosPorRaiz = new Map<string, Residual[]>();
  for (const r of residuos) {
    const raiz = uniao.raizDe(r.codigoProduto);
    const lista = residuosPorRaiz.get(raiz) ?? [];
    lista.push(r);
    residuosPorRaiz.set(raiz, lista);
  }

  const resultado: DivergenciaCodigoCruzado[] = [];
  for (const [raiz, lista] of residuosPorRaiz) {
    const grupoDescricao = descricaoPorRaiz.get(raiz) ?? "";
    const faltas = lista.filter((r) => r.residual < 0);
    const sobras = lista.filter((r) => r.residual > 0);

    for (const falta of faltas) {
      for (const sobra of sobras) {
        if (falta.codigoProduto === sobra.codigoProduto) continue; // mesmo código = já é papel do cruzamento.ts, não desta dimensão
        if (!periodosSeSobrepoe(falta, sobra)) continue;
        if (Math.abs(Math.abs(falta.residual) - sobra.residual) > EPSILON) continue; // quantidade precisa bater

        resultado.push({
          grupoDescricao,
          codigoFalta: {
            codigo: falta.codigoProduto,
            descricao: falta.descricaoProduto,
            lojaId: falta.lojaId,
            lojaPdv: falta.lojaPdv,
            lojaNome: falta.lojaNome,
            cicloId: falta.cicloId,
            quantidade: falta.residual,
          },
          codigoSobra: {
            codigo: sobra.codigoProduto,
            descricao: sobra.descricaoProduto,
            lojaId: sobra.lojaId,
            lojaPdv: sobra.lojaPdv,
            lojaNome: sobra.lojaNome,
            cicloId: sobra.cicloId,
            quantidade: sobra.residual,
          },
          mesmaLoja: falta.lojaId === sobra.lojaId,
        });
      }
    }
  }

  return resultado;
}

/**
 * Mesmo resultado de getDivergenciasCodigoCruzado(), filtrado pra uma loja
 * específica (usado na tela do ciclo - item 4b do pedido). Reaproveita a
 * função inteira em vez de duplicar a query: o volume de dados é pequeno o
 * bastante (poucas dezenas de lojas) pra não valer a pena uma versão
 * server-side filtrada à parte.
 */
export async function getDivergenciasCodigoCruzadoPorLoja(lojaId: string): Promise<DivergenciaCodigoCruzado[]> {
  const todas = await getDivergenciasCodigoCruzado();
  return todas.filter((d) => d.codigoFalta.lojaId === lojaId || d.codigoSobra.lojaId === lojaId);
}
