import Link from "next/link";
import { auth } from "@/auth";
import { getLojasVisiveis } from "@/lib/access";
import { getRankingLojas } from "@/lib/ranking";
import {
  getComposicaoDivergenciaGrupo,
  getCruzamentosPorConfianca,
  getEvolucaoDivergenciaGrupo,
  getRequisicoesPorCategoria,
} from "@/lib/dashboard";
import { getDivergenciasCodigoCruzado } from "@/lib/cruzamento-codigo";
import {
  ComposicaoDivergenciaChart,
  CruzamentosChart,
  EvolucaoDivergenciaChart,
  RankingBarChart,
  RequisicoesPorCategoriaChart,
} from "@/components/dashboard-charts";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

function Cartao({
  rotulo,
  valor,
  destaque,
  legenda,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  legenda?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{rotulo}</p>
      <p className={`text-2xl font-semibold ${destaque ? "text-red-600" : "text-neutral-900"}`}>{valor}</p>
      {legenda && <p className="mt-1 text-xs text-neutral-400">{legenda}</p>}
    </div>
  );
}

function CartaoGrafico({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-brand-dark">{titulo}</p>
      {descricao && <p className="mb-2 text-xs text-neutral-500">{descricao}</p>}
      {children}
    </div>
  );
}

function SemDados({ texto }: { texto: string }) {
  return <p className="py-10 text-center text-sm text-neutral-400">{texto}</p>;
}

export default async function Home() {
  const session = await auth();
  if (!session) return null;
  const user = session.user;
  const ehGerente = user.perfil === "GERENTE_VAREJO" || user.perfil === "GERENTE_REVENDA";

  const lojas = await getLojasVisiveis(user);
  const lojasElegiveis = lojas.filter((l) => l.ativa && (l.tipoLoja === "VAREJO" || l.tipoLoja === "REVENDA"));

  const linhasRanking = await getRankingLojas(user);
  const semDadosSuficientes = linhasRanking.length === 0;

  const lojasComFechamento = linhasRanking.length;
  const lojasSemFechamento = Math.max(0, lojasElegiveis.length - lojasComFechamento);
  const lojasAcimaDaMeta = linhasRanking.filter((l) => l.acimaDaMeta).length;
  const divergenciaTotalGrupo = linhasRanking.reduce((acc, l) => acc + l.divergenciaValor, 0);

  const [evolucao, composicao, requisicoes, cruzamentos, cruzamentosCodigo] = await Promise.all([
    getEvolucaoDivergenciaGrupo(user),
    getComposicaoDivergenciaGrupo(user),
    getRequisicoesPorCategoria(user),
    ehGerente ? Promise.resolve(null) : getCruzamentosPorConfianca(),
    ehGerente ? Promise.resolve(null) : getDivergenciasCodigoCruzado(),
  ]);

  // Dois tipos de cruzamento contam pro total: mesmo código em lojas
  // diferentes (getCruzamentosPorConfianca) e códigos diferentes pro mesmo
  // produto (getDivergenciasCodigoCruzado, cruzamento-codigo.ts) - o segundo
  // não tem nível de confiança, então soma à parte no card mas não entra no
  // gráfico "por nível de confiança" (que só existe pro primeiro tipo).
  const totalCruzamentosConfianca = cruzamentos?.reduce((acc, c) => acc + c.quantidade, 0) ?? 0;
  const totalCruzamentosCodigo = cruzamentosCodigo?.length ?? 0;
  const totalCruzamentos = totalCruzamentosConfianca + totalCruzamentosCodigo;
  const totalRequisicoes = requisicoes.reduce((acc, r) => acc + r.custoTotal, 0);
  const totalComposicao = composicao.sacola + composicao.resto;

  const dadosRanking = linhasRanking.map((l) => ({
    nome: `${l.pdv} — ${l.nome}`,
    percentual: l.percentualSobreFaturamento ?? 0,
    acimaDaMeta: l.acimaDaMeta,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium text-brand-dark">Visão geral</h1>
        <p className="text-sm text-neutral-500">
          Painel consolidado do grupo: divergência, ranking entre lojas, cruzamentos e requisições.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          href="/lojas"
          className="rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-300"
        >
          <p className="text-sm text-neutral-500">Lojas ativas</p>
          <p className="text-2xl font-semibold text-neutral-900">{lojasElegiveis.length}</p>
        </Link>
        <Cartao
          rotulo="Com lançamento fechado"
          valor={String(lojasComFechamento)}
          legenda="já têm ao menos 1 ciclo fechado"
        />
        <Cartao
          rotulo="Sem nenhum fechamento"
          valor={String(lojasSemFechamento)}
          legenda="ainda não fecharam ciclo algum"
        />
        <Cartao
          rotulo="Acima da meta"
          valor={String(lojasAcimaDaMeta)}
          destaque={lojasAcimaDaMeta > 0}
          legenda="no lançamento fechado mais recente"
        />
        <Cartao
          rotulo="Divergência do grupo"
          valor={formatoBRL.format(divergenciaTotalGrupo)}
          legenda={divergenciaTotalGrupo < 0 ? "falta, no total" : "sobra, no total"}
        />
        {!ehGerente && (
          <Cartao
            rotulo="Cruzamentos em aberto"
            valor={String(totalCruzamentos)}
            destaque={totalCruzamentos > 0}
            legenda={
              totalCruzamentosCodigo > 0
                ? `${totalCruzamentosConfianca} entre lojas + ${totalCruzamentosCodigo} de código`
                : "sem transferência/ajuste que explique"
            }
          />
        )}
      </div>

      {semDadosSuficientes ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-400">
          <p className="text-sm">Ainda não há lançamentos fechados suficientes para gerar os gráficos.</p>
          <p className="text-sm">Assim que alguma loja fechar o primeiro ciclo, o painel aparece aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <CartaoGrafico
            titulo="Ranking entre lojas"
            descricao="% de divergência sobre faturamento no lançamento fechado mais recente de cada loja — vermelho indica acima da meta."
          >
            <RankingBarChart dados={dadosRanking} />
          </CartaoGrafico>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CartaoGrafico
              titulo="Evolução da divergência do grupo"
              descricao="Média mensal de % sobre faturamento entre as lojas com lançamento fechado no mês."
            >
              {evolucao.length === 0 ? (
                <SemDados texto="Sem histórico suficiente ainda (precisa de mais de um mês com faturamento lançado)." />
              ) : (
                <EvolucaoDivergenciaChart dados={evolucao} />
              )}
            </CartaoGrafico>

            <CartaoGrafico
              titulo="Composição da divergência"
              descricao="Sacola/material auxiliar vs. resto, somando o lançamento fechado mais recente de cada loja."
            >
              {totalComposicao === 0 ? (
                <SemDados texto="Sem valor de divergência suficiente ainda para compor o gráfico." />
              ) : (
                <ComposicaoDivergenciaChart sacola={composicao.sacola} resto={composicao.resto} />
              )}
            </CartaoGrafico>

            {!ehGerente && cruzamentos && (
              <CartaoGrafico
                titulo="Cruzamentos por nível de confiança"
                descricao="Falta numa loja e sobra em outra, no mesmo período, sem transferência/ajuste que explique."
              >
                {totalCruzamentosConfianca === 0 ? (
                  <SemDados texto="Nenhuma divergência cruzada em aberto encontrada até agora." />
                ) : (
                  <CruzamentosChart dados={cruzamentos} />
                )}
                {totalCruzamentosCodigo > 0 && (
                  <p className="mt-2 text-xs text-neutral-500">
                    + {totalCruzamentosCodigo} cruzamento(s) de código equivalente (mesmo produto,
                    códigos diferentes) — ver{" "}
                    <Link href="/cruzamento" className="hover:text-brand-dark hover:underline">
                      Cruzamentos
                    </Link>
                    .
                  </p>
                )}
              </CartaoGrafico>
            )}

            <CartaoGrafico
              titulo="Requisições por categoria"
              descricao="Custo total de itens requisitados, por motivo (Demonstrador, Brinde, Perda/Roubo, Premiação, Outros)."
            >
              {totalRequisicoes === 0 ? (
                <SemDados texto="Nenhuma requisição lançada ainda." />
              ) : (
                <RequisicoesPorCategoriaChart dados={requisicoes} />
              )}
            </CartaoGrafico>
          </div>
        </div>
      )}
    </div>
  );
}
