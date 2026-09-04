import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import { LogisticaForm } from "./logistica-form";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function LogisticaReversaPage() {
  const session = await auth();
  if (!session) return null;
  const podeGerenciar = session.user.perfil === "AUDITOR";

  const lojas = await getLojasVisiveis(session.user);
  const registros = await prisma.logisticaReversa.findMany({
    where: { lojaId: { in: lojas.map((l) => l.id) } },
    include: { loja: true },
    orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
    take: 200,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Logística reversa</h1>
        <p className="text-sm text-neutral-500">Volume e valor enviado por loja e por mês.</p>
      </div>

      {podeGerenciar && <LogisticaForm lojas={lojas} />}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">Período</th>
              <th className="px-4 py-2 font-medium">Volume</th>
              <th className="px-4 py-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {registros.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-neutral-700">
                  {r.loja.pdv} — {r.loja.nome}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {MESES[r.mesReferencia - 1]}/{r.anoReferencia}
                </td>
                <td className="px-4 py-2 text-neutral-700">{r.volumeItens ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(r.valorTotal))}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum registro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
