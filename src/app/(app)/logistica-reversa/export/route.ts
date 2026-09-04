import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import type { TipoLoja } from "@/generated/prisma/client";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const url = new URL(request.url);
  const lojaFiltro = url.searchParams.get("loja") ?? undefined;
  const tipoFiltro = (url.searchParams.get("tipo") as TipoLoja) ?? undefined;
  const mes = url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : undefined;
  const ano = url.searchParams.get("ano") ? Number(url.searchParams.get("ano")) : undefined;

  const lojas = await getLojasVisiveis(session.user);
  const lojasFiltradas = tipoFiltro ? lojas.filter((l) => l.tipoLoja === tipoFiltro) : lojas;
  const lojaIds = (lojaFiltro ? lojasFiltradas.filter((l) => l.id === lojaFiltro) : lojasFiltradas).map(
    (l) => l.id
  );

  const registros = await prisma.logisticaReversa.findMany({
    where: { lojaId: { in: lojaIds }, mesReferencia: mes, anoReferencia: ano },
    include: { loja: true },
    orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
    take: 500,
  });

  const dados = registros.map((r) => ({
    Loja: `${r.loja.pdv} - ${r.loja.nome}`,
    Período: `${MESES[r.mesReferencia - 1]}/${r.anoReferencia}`,
    Volume: r.volumeItens ?? "",
    Valor: Number(r.valorTotal),
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Logística Reversa");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="logistica-reversa-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
