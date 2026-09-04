import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLojasVisiveis } from "@/lib/access";
import type { TipoDevolucao } from "@/generated/prisma/client";

const ROTULO_STATUS: Record<string, string> = { PENDENTE: "Pendente", PARCIAL: "Parcial", INTEGRAL: "Integral" };
const ROTULO_TIPO: Record<string, string> = { DEFEITO: "Defeito", FALTA_MERCADORIA: "Falta de mercadoria" };

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const url = new URL(request.url);
  const lojaFiltro = url.searchParams.get("loja") ?? undefined;
  const tipoFiltro = (url.searchParams.get("tipo") as TipoDevolucao) || undefined;

  const lojas = await getLojasVisiveis(session.user);
  const lojaIds = lojas.map((l) => l.id);

  const defeitos = await prisma.defeito.findMany({
    where: { lojaId: lojaFiltro ? lojaFiltro : { in: lojaIds }, tipoDevolucao: tipoFiltro },
    include: { loja: true },
    orderBy: { dataEnvio: "desc" },
    take: 500,
  });

  const dados = defeitos.map((d) => ({
    Loja: `${d.loja.pdv} - ${d.loja.nome}`,
    NF: d.numeroNotaFiscal,
    Fornecedor: d.fornecedorNome ?? "",
    Envio: d.dataEnvio.toLocaleDateString("pt-BR"),
    "Valor enviado": Number(d.valorEnviado),
    Tipo: d.tipoDevolucao ? ROTULO_TIPO[d.tipoDevolucao] : "Sem classificar",
    Status: ROTULO_STATUS[d.statusReembolso],
    "Valor reembolsado": Number(d.valorReembolsado),
    "Recebimento reembolso": d.dataRecebimentoReembolso?.toLocaleDateString("pt-BR") ?? "",
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Defeitos");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="defeitos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
