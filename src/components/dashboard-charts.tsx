"use client";

// Gráficos do dashboard (item 9 do briefing: "Gráficos por loja e
// consolidados"). Precisam ser Client Components porque recharts usa APIs de
// navegador (medição de layout, SVG interativo) — a página em si
// (src/app/(app)/page.tsx) continua sendo um Server Component que busca os
// dados e passa só props serializáveis pra cá.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VERDE = "#00674a";
const VERMELHO = "#dc2626";
const AMBAR = "#f59e0b";
const CINZA = "#a3a3a3";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

// Tooltip simples e consistente entre os gráficos, sem depender de props
// função vindas do servidor (props que cruzam a fronteira server->client
// precisam ser serializáveis — ver docs/01-app/02-guides/server-and-client-boundary.md).
function CaixaTooltip({ label, linhas }: { label?: string; linhas: { texto: string; cor?: string }[] }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
      {label && <p className="mb-1 font-medium text-neutral-700">{label}</p>}
      {linhas.map((l, i) => (
        <p key={i} style={{ color: l.cor }}>
          {l.texto}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// a. Evolução da divergência do grupo ao longo do tempo
// ---------------------------------------------------------------------------
export function EvolucaoDivergenciaChart({
  dados,
}: {
  dados: { rotulo: string; percentualMedio: number; quantidadeLojas: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: "#737373" }} />
        <YAxis tick={{ fontSize: 12, fill: "#737373" }} tickFormatter={(v) => `${v}%`} width={48} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { percentualMedio: number; quantidadeLojas: number };
            return (
              <CaixaTooltip
                label={label as string}
                linhas={[
                  { texto: `Média: ${formatoPct(p.percentualMedio)}`, cor: VERDE },
                  { texto: `${p.quantidadeLojas} loja(s) com fechamento no mês` },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="percentualMedio"
          stroke={VERDE}
          strokeWidth={2}
          dot={{ r: 3, fill: VERDE }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// b. Ranking visual (barras) — reaproveita getRankingLojas
// ---------------------------------------------------------------------------
export function RankingBarChart({
  dados,
}: {
  dados: { nome: string; percentual: number; acimaDaMeta: boolean }[];
}) {
  const altura = Math.max(260, dados.length * 28);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#737373" }} tickFormatter={(v) => `${v}%`} />
        <YAxis
          type="category"
          dataKey="nome"
          tick={{ fontSize: 11, fill: "#404040" }}
          width={140}
          interval={0}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { nome: string; percentual: number; acimaDaMeta: boolean };
            return (
              <CaixaTooltip
                label={p.nome}
                linhas={[
                  {
                    texto: `${formatoPct(p.percentual)} sobre faturamento${p.acimaDaMeta ? " — acima da meta" : ""}`,
                    cor: p.acimaDaMeta ? VERMELHO : VERDE,
                  },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.acimaDaMeta ? VERMELHO : VERDE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// c. Composição da divergência (sacola/material auxiliar vs. resto)
// ---------------------------------------------------------------------------
export function ComposicaoDivergenciaChart({ sacola, resto }: { sacola: number; resto: number }) {
  const dados = [
    { nome: "Sacola / material auxiliar", valor: sacola, cor: AMBAR },
    { nome: "Resto", valor: resto, cor: VERDE },
  ];
  const total = sacola + resto;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={dados}
          dataKey="valor"
          nameKey="nome"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {dados.map((d, i) => (
            <Cell key={i} fill={d.cor} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { nome: string; valor: number; cor: string };
            const pct = total > 0 ? (p.valor / total) * 100 : 0;
            return (
              <CaixaTooltip
                linhas={[{ texto: `${p.nome}: ${formatoBRL.format(p.valor)} (${formatoPct(pct)})`, cor: p.cor }]}
              />
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// d. Cruzamentos por nível de confiança
// ---------------------------------------------------------------------------
const ROTULO_CONFIANCA: Record<string, string> = {
  CONFIRMADA: "Confirmada",
  SUSPEITA_NIVEL_2: "Suspeita (nível 2)",
  SUSPEITA_NIVEL_1: "Suspeita (nível 1)",
};

const COR_CONFIANCA: Record<string, string> = {
  CONFIRMADA: VERMELHO,
  SUSPEITA_NIVEL_2: AMBAR,
  SUSPEITA_NIVEL_1: CINZA,
};

export function CruzamentosChart({
  dados,
}: {
  dados: { confianca: string; quantidade: number }[];
}) {
  const dadosRotulados = dados.map((d) => ({ ...d, rotulo: ROTULO_CONFIANCA[d.confianca] ?? d.confianca }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dadosRotulados} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#737373" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#737373" }} width={32} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { rotulo: string; quantidade: number; confianca: string };
            return (
              <CaixaTooltip
                linhas={[{ texto: `${p.rotulo}: ${p.quantidade}`, cor: COR_CONFIANCA[p.confianca] }]}
              />
            );
          }}
        />
        <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
          {dadosRotulados.map((d, i) => (
            <Cell key={i} fill={COR_CONFIANCA[d.confianca] ?? CINZA} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// e. Requisições por categoria
// ---------------------------------------------------------------------------
export function RequisicoesPorCategoriaChart({
  dados,
}: {
  dados: { categoria: string; custoTotal: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: "#737373" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#737373" }}
          width={64}
          tickFormatter={(v) => formatoBRL.format(v).replace("R$", "").trim()}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { categoria: string; custoTotal: number };
            return (
              <CaixaTooltip
                label={p.categoria}
                linhas={[{ texto: formatoBRL.format(p.custoTotal), cor: VERDE }]}
              />
            );
          }}
        />
        <Bar dataKey="custoTotal" fill={VERDE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
