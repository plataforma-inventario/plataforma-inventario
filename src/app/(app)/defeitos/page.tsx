import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import { DefeitoForm } from "./defeito-form";
import { atualizarReembolso } from "./actions";

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  INTEGRAL: "Integral",
};

const COR_STATUS: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PARCIAL: "bg-blue-50 text-blue-700",
  INTEGRAL: "bg-emerald-50 text-emerald-700",
};

export default async function DefeitosPage() {
  const session = await auth();
  if (!session) return null;
  const podeGerenciar = session.user.perfil === "AUDITOR";

  const lojas = await getLojasVisiveis(session.user);
  const lojaIds = lojas.map((l) => l.id);

  const defeitos = await prisma.defeito.findMany({
    where: { lojaId: { in: lojaIds } },
    include: { loja: true },
    orderBy: { dataEnvio: "desc" },
    take: 200,
  });

  const recebidos = defeitos.filter((d) => d.dataRecebimentoReembolso);
  const tempoMedioDias =
    recebidos.length > 0
      ? Math.round(
          recebidos.reduce(
            (acc, d) =>
              acc +
              (d.dataRecebimentoReembolso!.getTime() - d.dataEnvio.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / recebidos.length
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Defeitos</h1>
        <p className="text-sm text-neutral-500">
          Notas fiscais de defeito enviadas e status do reembolso.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:w-64">
        <p className="text-sm text-neutral-500">Tempo médio de reembolso</p>
        <p className="text-lg font-medium text-neutral-900">
          {tempoMedioDias !== null ? `${tempoMedioDias} dias` : "sem dados"}
        </p>
      </div>

      {podeGerenciar && <DefeitoForm lojas={lojas} />}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Loja</th>
              <th className="px-4 py-2 font-medium">NF</th>
              <th className="px-4 py-2 font-medium">Envio</th>
              <th className="px-4 py-2 font-medium">Enviado</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Reembolsado</th>
              {podeGerenciar && <th className="px-4 py-2 font-medium">Atualizar</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {defeitos.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-700">
                  {d.loja.pdv} — {d.loja.nome}
                </td>
                <td className="px-4 py-2 text-neutral-500">{d.numeroNotaFiscal}</td>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {d.dataEnvio.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-neutral-700">{formatoBRL.format(Number(d.valorEnviado))}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[d.statusReembolso]}`}>
                    {ROTULO_STATUS[d.statusReembolso]}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-700">
                  {formatoBRL.format(Number(d.valorReembolsado))}
                </td>
                {podeGerenciar && (
                  <td className="px-4 py-2">
                    <form
                      action={atualizarReembolso.bind(null, d.id)}
                      className="flex flex-wrap items-center gap-1"
                    >
                      <select
                        name="statusReembolso"
                        defaultValue={d.statusReembolso}
                        className="rounded border border-neutral-300 px-1 py-1 text-xs"
                      >
                        <option value="PENDENTE">Pendente</option>
                        <option value="PARCIAL">Parcial</option>
                        <option value="INTEGRAL">Integral</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        name="valorReembolsado"
                        defaultValue={d.valorReembolsado.toString()}
                        className="w-20 rounded border border-neutral-300 px-1 py-1 text-xs"
                      />
                      <input
                        type="date"
                        name="dataRecebimentoReembolso"
                        defaultValue={d.dataRecebimentoReembolso?.toISOString().slice(0, 10) ?? ""}
                        className="rounded border border-neutral-300 px-1 py-1 text-xs"
                      />
                      <input type="hidden" name="motivo" value="Atualização de status de reembolso" />
                      <button className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100">
                        Salvar
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {defeitos.length === 0 && (
              <tr>
                <td colSpan={podeGerenciar ? 7 : 6} className="px-4 py-6 text-center text-neutral-400">
                  Nenhum defeito registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
