import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { vincularGerente, desvincularGerente } from "../actions";
import { LojaEditForm } from "./loja-edit-form";
import { MetaDivergenciaForm } from "./meta-divergencia-form";
import { HistoricoDivergencia } from "./historico-divergencia";
import { getHistoricoDivergencia } from "@/lib/divergencia";

const PERFIL_GERENTE_POR_TIPO = {
  VAREJO: "GERENTE_VAREJO",
  REVENDA: "GERENTE_REVENDA",
} as const;

export default async function LojaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const loja = await prisma.loja.findUnique({
    where: { id },
    include: { grupo: true, regiao: true, gerentes: { include: { user: true } } },
  });
  if (!loja) notFound();

  const podeGerenciar = session.user.perfil === "AUDITOR";
  if (!podeGerenciar) {
    // gerente só pode ver lojas do seu tipo às quais está vinculado; diretoria/logística veem tudo (leitura)
    const perfil = session.user.perfil;
    if (perfil === "GERENTE_VAREJO" || perfil === "GERENTE_REVENDA") {
      const vinculado = loja.gerentes.some((g) => g.userId === session.user.id);
      if (!vinculado) redirect("/lojas");
    }
  }

  const perfilGerenteEsperado =
    loja.tipoLoja === "VAREJO" || loja.tipoLoja === "REVENDA"
      ? PERFIL_GERENTE_POR_TIPO[loja.tipoLoja]
      : null;

  const [grupos, regioes, candidatosGerente] =
    podeGerenciar && perfilGerenteEsperado
      ? await Promise.all([
          prisma.grupo.findMany({ orderBy: { nome: "asc" } }),
          prisma.regiao.findMany({ orderBy: { nome: "asc" } }),
          prisma.user.findMany({
            where: {
              ativo: true,
              perfil: perfilGerenteEsperado,
              lojasGeridas: { none: { lojaId: loja.id } },
            },
            orderBy: { nome: "asc" },
          }),
        ])
      : podeGerenciar
        ? await Promise.all([
            prisma.grupo.findMany({ orderBy: { nome: "asc" } }),
            prisma.regiao.findMany({ orderBy: { nome: "asc" } }),
            Promise.resolve([]),
          ])
        : [[], [], []];

  const ciclos = await prisma.ciclo.findMany({
    where: { lojaId: loja.id },
    orderBy: { dataFim: "desc" },
    take: 10,
  });

  const historicoDivergencia = await getHistoricoDivergencia(loja.id);

  const podeVerHistorico = session.user.perfil === "AUDITOR" || session.user.perfil === "DIRETORIA";
  const historico = podeVerHistorico
    ? await prisma.logAlteracao.findMany({
        where: { tabela: { in: ["Loja", "LojaGerente"] }, registroId: loja.id },
        include: { usuario: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">PDV {loja.pdv}</p>
          <h1 className="text-lg font-medium text-neutral-900">{loja.nome}</h1>
        </div>
        {podeGerenciar && (
          <Link
            href={`/lojas/${loja.id}/novo-ciclo`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Novo lançamento
          </Link>
        )}
      </div>

      {podeGerenciar ? (
        <LojaEditForm
          lojaId={loja.id}
          grupos={grupos}
          regioes={regioes}
          loja={{
            pdv: loja.pdv,
            nome: loja.nome,
            cnpj: loja.cnpj,
            tipoUnidade: loja.tipoUnidade,
            tipoLoja: loja.tipoLoja,
            grupoId: loja.grupoId,
            regiaoId: loja.regiaoId,
            cicloContagem: loja.cicloContagem,
            ativa: loja.ativa,
          }}
        />
      ) : (
        <dl className="grid max-w-lg grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">CNPJ</dt>
          <dd className="text-neutral-900">{loja.cnpj}</dd>
          <dt className="text-neutral-500">Grupo</dt>
          <dd className="text-neutral-900">{loja.grupo.nome}</dd>
          <dt className="text-neutral-500">Região</dt>
          <dd className="text-neutral-900">{loja.regiao?.nome ?? "—"}</dd>
          <dt className="text-neutral-500">Ciclo</dt>
          <dd className="text-neutral-900">{loja.cicloContagem ?? "não definido"}</dd>
        </dl>
      )}

      {(session.user.perfil === "AUDITOR" || session.user.perfil === "DIRETORIA") && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Meta de divergência</h2>
          <MetaDivergenciaForm
            lojaId={loja.id}
            metaDivergenciaPercentual={loja.metaDivergenciaPercentual?.toString() ?? null}
            metaDivergenciaValor={loja.metaDivergenciaValor?.toString() ?? null}
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Gerentes responsáveis</h2>
        <ul className="mb-3 flex flex-col gap-1">
          {loja.gerentes.length === 0 && (
            <li className="text-sm text-neutral-400">Nenhum gerente vinculado.</li>
          )}
          {loja.gerentes.map((g) => (
            <li
              key={g.userId}
              className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <span>
                {g.user.nome} <span className="text-neutral-400">({g.user.email})</span>
              </span>
              {podeGerenciar && (
                <form action={desvincularGerente.bind(null, loja.id, g.userId)}>
                  <button className="text-neutral-400 hover:text-red-600">remover</button>
                </form>
              )}
            </li>
          ))}
        </ul>

        {podeGerenciar && candidatosGerente.length > 0 && (
          <form
            action={vincularGerente.bind(null, loja.id)}
            className="flex max-w-md items-center gap-2"
          >
            <select
              name="userId"
              required
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            >
              <option value="" disabled defaultValue="">
                Selecionar gerente...
              </option>
              {candidatosGerente.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.email})
                </option>
              ))}
            </select>
            <button className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
              Vincular
            </button>
          </form>
        )}
        {podeGerenciar && candidatosGerente.length === 0 && loja.tipoLoja !== "LOGISTICA" && (
          <p className="text-sm text-neutral-400">
            Nenhum usuário gerente disponível para vincular — crie um em Usuários.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Lançamentos</h2>
        {ciclos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum lançamento ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ciclos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/ciclos/${c.id}`}
                  className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <span>
                    {c.dataInicio.toLocaleDateString("pt-BR")} até{" "}
                    {c.dataFim.toLocaleDateString("pt-BR")} ·{" "}
                    {c.tipoInventario === "COMPLETO" ? "Completo" : "Cíclico"}
                  </span>
                  <span
                    className={
                      c.status === "FECHADO"
                        ? "text-emerald-700"
                        : "text-amber-600"
                    }
                  >
                    {c.status === "FECHADO" ? "Fechado" : "Em aberto"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Evolução de divergência do inventário
        </h2>
        <HistoricoDivergencia pontos={historicoDivergencia} />
      </div>

      {podeVerHistorico && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Histórico de alterações</h2>
          {historico.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma alteração registrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {historico.map((h) => (
                <li
                  key={h.id}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600"
                >
                  <span className="text-neutral-400">{h.createdAt.toLocaleString("pt-BR")}</span> —{" "}
                  {h.usuario.nome} alterou <strong>{h.campo}</strong> de{" "}
                  <span className="text-neutral-400">{h.valorAnterior ?? "—"}</span> para{" "}
                  <span className="text-neutral-900">{h.valorNovo ?? "—"}</span>
                  <div className="text-xs text-neutral-400">Motivo: {h.motivo}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
