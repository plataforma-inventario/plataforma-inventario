import { auth } from "@/auth";
import { MANUAL, SECOES_TOC, type Bloco } from "@/lib/manual-conteudo";

function renderBloco(bloco: Bloco, i: number) {
  switch (bloco.tipo) {
    case "h2":
      return (
        <h2 key={i} id={bloco.id} className="scroll-mt-20 pt-2 text-lg font-semibold text-brand-dark">
          {bloco.texto}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="pt-2 text-base font-medium text-neutral-900">
          {bloco.texto}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="text-sm leading-relaxed text-neutral-700">
          {bloco.texto}
        </p>
      );
    case "lista":
      return (
        <ul key={i} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-700">
          {bloco.itens.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    case "listaNumerada":
      return (
        <ol key={i} className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-neutral-700">
          {bloco.itens.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ol>
      );
    case "tabela":
      return (
        <div key={i} className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            {bloco.cabecalho.some((c) => c) && (
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  {bloco.cabecalho.map((c, j) => (
                    <th key={j} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-neutral-100">
              {bloco.linhas.map((linha, j) => (
                <tr key={j}>
                  {linha.map((v, k) => (
                    <td key={k} className={`px-3 py-2 align-top ${k === 0 ? "font-medium text-neutral-900" : "text-neutral-600"}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "aviso":
      return (
        <div key={i} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {bloco.texto}
        </div>
      );
    case "exemplo":
      return (
        <div key={i} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-1 text-xs font-medium text-neutral-500">{bloco.titulo}</p>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-neutral-700">
            {bloco.texto}
          </pre>
        </div>
      );
  }
}

export default async function AjudaPage() {
  const session = await auth();
  if (!session) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="shrink-0 lg:sticky lg:top-20 lg:h-fit lg:w-56">
        <p className="mb-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">Neste manual</p>
        <nav className="flex flex-col gap-1 text-sm">
          {SECOES_TOC.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-neutral-600 hover:text-brand-dark hover:underline">
              {s.label}
            </a>
          ))}
        </nav>
        <a
          href="/ajuda/export-pdf"
          className="mt-4 inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          Baixar em PDF
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h1 className="text-lg font-medium text-brand-dark">Manual de alimentação da plataforma</h1>
          <p className="text-sm text-neutral-500">
            Passo a passo de como lançar os arquivos de cada período — para quem estiver cobrindo o
            lançamento de dados.
          </p>
        </div>
        {MANUAL.map(renderBloco)}
      </div>
    </div>
  );
}
