import Link from "next/link";
import { getCalendarioLojas } from "@/lib/calendario";

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function CalendarioPage() {
  const lojas = await getCalendarioLojas();
  const atrasadas = lojas.filter((l) => l.atrasada);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Calendário de visitas</h1>
        <p className="text-sm text-neutral-500">
          Próximo mês esperado de inventário por loja, considerando o ciclo (mensal/bimestral/
          trimestral) e o subgrupo do calendário fixo de auditoria.
        </p>
      </div>

      {atrasadas.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-medium text-red-700">
            {atrasadas.length} loja(s) com inventário atrasado
          </p>
          <ul className="flex flex-col gap-1">
            {atrasadas.map((l) => (
              <li key={l.lojaId} className="text-sm text-red-700">
                <Link href={`/lojas/${l.lojaId}`} className="hover:underline">
                  {l.pdv} — {l.nome}
                </Link>{" "}
                — esperado em {MESES[l.mesAnoEsperado.mes]}/{l.mesAnoEsperado.ano}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Grupo</th>
              <th className="px-4 py-2 font-medium">Último lançamento</th>
              <th className="px-4 py-2 font-medium">Próximo esperado</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {lojas.map((l) => (
              <tr key={l.lojaId} className={l.atrasada ? "bg-red-50" : undefined}>
                <td className="px-4 py-2 text-neutral-700">
                  <Link href={`/lojas/${l.lojaId}`} className="hover:underline">
                    {l.pdv} — {l.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-500">{l.grupo}</td>
                <td className="px-4 py-2 text-neutral-500">
                  {l.ultimoCicloDataFim ? l.ultimoCicloDataFim.toLocaleDateString("pt-BR") : "nenhum"}
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  {MESES[l.mesAnoEsperado.mes]}/{l.mesAnoEsperado.ano}
                </td>
                <td className={`px-4 py-2 font-medium ${l.atrasada ? "text-red-600" : "text-emerald-700"}`}>
                  {l.atrasada ? "Atrasada" : "Em dia"}
                </td>
              </tr>
            ))}
            {lojas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
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
