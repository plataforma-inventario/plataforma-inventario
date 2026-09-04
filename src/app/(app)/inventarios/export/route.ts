import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { getInventarios } from "@/lib/relatorios";
import type { TipoInventario, TipoLoja } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const url = new URL(request.url);
  const linhas = await getInventarios(session.user, {
    lojaId: url.searchParams.get("loja") ?? undefined,
    mes: url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : undefined,
    ano: url.searchParams.get("ano") ? Number(url.searchParams.get("ano")) : undefined,
    dataInicio: url.searchParams.get("dataInicio")
      ? new Date(`${url.searchParams.get("dataInicio")}T00:00:00`)
      : undefined,
    dataFim: url.searchParams.get("dataFim")
      ? new Date(`${url.searchParams.get("dataFim")}T00:00:00`)
      : undefined,
    tipoLoja: (url.searchParams.get("tipo") as TipoLoja) ?? undefined,
    tipoInventario: (url.searchParams.get("tipoInventario") as TipoInventario) ?? undefined,
  });

  const dados = linhas.map((l) => ({
    Data: l.dataFim.toLocaleDateString("pt-BR"),
    PDV: l.pdv,
    Loja: l.nomeLoja,
    Região: l.regiaoNome ?? "",
    "Tipo loja": l.tipoLoja,
    Ciclo: l.cicloContagem ?? "",
    Inventário: l.tipoInventario,
    "Divergência R$": l.divergenciaValor,
    "% estoque": l.percentualSobreEstoque ?? "",
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Inventários");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventarios-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
