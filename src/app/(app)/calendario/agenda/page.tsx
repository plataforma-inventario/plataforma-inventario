import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UploadImagemAgendaForm } from "./upload-form";
import { DataLojaInput } from "./data-loja-input";
import { removerImagemAgenda } from "./actions";

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function paraInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.perfil !== "AUDITOR") redirect("/");

  const params = await searchParams;
  const hoje = new Date();
  const ano = Number(params.ano) || hoje.getFullYear() + 1;
  const mes = Number(params.mes) || 1;

  const [lojas, imagens, visitas] = await Promise.all([
    prisma.loja.findMany({
      where: { ativa: true, cicloContagem: { not: null } },
      orderBy: [{ regiao: { nome: "asc" } }, { nome: "asc" }],
    }),
    prisma.imagemAgenda.findMany({ where: { ano, mes }, orderBy: { createdAt: "desc" } }),
    prisma.visitaAgendada.findMany({ where: { ano, mes } }),
  ]);

  const mapaVisitas = new Map(visitas.map((v) => [v.lojaId, v]));
  const anos = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() + i - 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Agenda de visitas</h1>
        <p className="text-sm text-neutral-500">
          Importe o print do Google Agenda como referência e digite o dia exato combinado com
          cada loja — isso passa a valer no Calendário no lugar do mês estimado pelo cronograma.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="sel-mes" className="text-sm font-medium text-neutral-700">
            Mês
          </label>
          <select
            id="sel-mes"
            name="mes"
            defaultValue={mes}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {MESES.slice(1).map((nome, i) => (
              <option key={i + 1} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sel-ano" className="text-sm font-medium text-neutral-700">
            Ano
          </label>
          <select
            id="sel-ano"
            name="ano"
            defaultValue={ano}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
        >
          Ver
        </button>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium text-neutral-900">
          Print de referência — {MESES[mes]}/{ano}
        </h2>
        <UploadImagemAgendaForm ano={ano} mes={mes} />
        {imagens.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {imagens.map((img) => (
              <div key={img.id} className="flex flex-col gap-1">
                <a href={`/calendario/agenda/imagem/${img.id}`} target="_blank" rel="noreferrer">
                  <img
                    src={`/calendario/agenda/imagem/${img.id}`}
                    alt={img.nomeArquivo}
                    className="h-32 w-auto rounded border border-neutral-200 object-cover"
                  />
                </a>
                <form action={removerImagemAgenda.bind(null, img.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Dia combinado — {MESES[mes]}/{ano}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {lojas.map((loja) => {
              const visita = mapaVisitas.get(loja.id);
              return (
                <tr key={loja.id}>
                  <td className="px-4 py-2 text-neutral-700">
                    {loja.pdv} — {loja.nome}
                  </td>
                  <td className="px-4 py-2">
                    <DataLojaInput
                      lojaId={loja.id}
                      ano={ano}
                      mes={mes}
                      dataAtual={visita ? paraInputDate(visita.dataAgendada) : ""}
                    />
                  </td>
                </tr>
              );
            })}
            {lojas.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-neutral-400">
                  Nenhuma loja com ciclo de contagem definido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
