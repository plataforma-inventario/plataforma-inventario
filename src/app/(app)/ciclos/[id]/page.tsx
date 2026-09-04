import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CategoriaArquivo } from "@/generated/prisma/client";
import { UploadSlot } from "./upload-slot";
import { fecharCiclo } from "./actions";

const CATEGORIAS: { categoria: CategoriaArquivo; label: string; formato: string }[] = [
  { categoria: "INVENTARIO", label: "Resultado do inventário", formato: "CSV" },
  {
    categoria: "TRANSFERENCIA_SAIDA",
    label: "Notas fiscais de transferência de saída",
    formato: "CSV",
  },
  {
    categoria: "TRANSFERENCIA_ENTRADA",
    label: "Notas fiscais de transferência de entrada",
    formato: "CSV",
  },
  { categoria: "AJUSTE", label: "Ajustes de estoque (entrada e saída)", formato: "PDF" },
  { categoria: "REQUISICAO", label: "Requisições do período", formato: "CSV" },
  { categoria: "FATURAMENTO", label: "Faturamento do período", formato: "XLS/XLSX" },
];

const ROTULO_TIPO_INVENTARIO: Record<string, string> = {
  CICLICO: "Cíclico",
  COMPLETO: "Completo",
};

const ROTULO_MOTIVO: Record<string, string> = {
  SUSPEITA_ROUBO: "Suspeita / diagnóstico de roubo",
  POS_NATAL_JANEIRO: "Inventário anual pós-Natal (janeiro)",
  OUTRO: "Outro",
};

export default async function CicloPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return null;

  const { id } = await params;
  const ciclo = await prisma.ciclo.findUnique({
    where: { id },
    include: { loja: true, arquivos: true },
  });
  if (!ciclo) notFound();

  const podeGerenciar = session.user.perfil === "AUDITOR";
  const arquivosPorCategoria = new Map(ciclo.arquivos.map((a) => [a.categoria, a]));
  const todosCompletos = CATEGORIAS.every((c) => arquivosPorCategoria.has(c.categoria));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/lojas/${ciclo.loja.id}`} className="text-sm text-neutral-500 hover:underline">
          ← {ciclo.loja.nome}
        </Link>
        <h1 className="text-lg font-medium text-neutral-900">
          Lançamento — {ciclo.dataInicio.toLocaleDateString("pt-BR")} até{" "}
          {ciclo.dataFim.toLocaleDateString("pt-BR")}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-neutral-500">
          <span>Tipo: {ROTULO_TIPO_INVENTARIO[ciclo.tipoInventario]}</span>
          {ciclo.motivoCompleto && (
            <span>
              Motivo: {ROTULO_MOTIVO[ciclo.motivoCompleto]}
              {ciclo.motivoDetalhe ? ` — ${ciclo.motivoDetalhe}` : ""}
            </span>
          )}
          <span className={ciclo.status === "FECHADO" ? "text-emerald-700" : "text-amber-600"}>
            {ciclo.status === "FECHADO" ? "Fechado" : "Em aberto"}
          </span>
        </div>
        {ciclo.observacao && (
          <p className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
            {ciclo.observacao}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATEGORIAS.map((c) => (
          <UploadSlot
            key={c.categoria}
            cicloId={ciclo.id}
            categoria={c.categoria}
            label={c.label}
            formatoEsperado={c.formato}
            podeGerenciar={podeGerenciar && ciclo.status === "ABERTO"}
            arquivo={
              arquivosPorCategoria.has(c.categoria)
                ? {
                    id: arquivosPorCategoria.get(c.categoria)!.id,
                    nomeArquivo: arquivosPorCategoria.get(c.categoria)!.nomeArquivo,
                    tamanhoBytes: arquivosPorCategoria.get(c.categoria)!.tamanhoBytes,
                    createdAt: arquivosPorCategoria.get(c.categoria)!.createdAt.toISOString(),
                  }
                : null
            }
          />
        ))}
      </div>

      {podeGerenciar && ciclo.status === "ABERTO" && (
        <div>
          <form action={fecharCiclo.bind(null, ciclo.id)}>
            <button
              type="submit"
              disabled={!todosCompletos}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fechar lançamento
            </button>
          </form>
          {!todosCompletos && (
            <p className="mt-2 text-sm text-neutral-400">
              Envie os 6 arquivos acima para poder fechar o lançamento.
            </p>
          )}
        </div>
      )}

      {ciclo.status === "FECHADO" && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-400">
          Lançamento fechado. O cruzamento automático de divergências e o cálculo de
          divergência do inventário chegam com o módulo de Inventários (próxima etapa).
        </div>
      )}
    </div>
  );
}
