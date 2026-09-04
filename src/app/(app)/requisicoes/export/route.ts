import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { getRequisicoes } from "@/lib/relatorios";
import type { TipoLoja } from "@/generated/prisma/client";

// Item 6: export tambem nunca inclui PDV, so razao social.
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const url = new URL(request.url);
  const { itens } = await getRequisicoes(session.user, {
    lojaId: url.searchParams.get("loja") ?? undefined,
    mes: url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : undefined,
    ano: url.searchParams.get("ano") ? Number(url.searchParams.get("ano")) : undefined,
    tipoLoja: (url.searchParams.get("tipo") as TipoLoja) ?? undefined,
  });

  const dados = itens.map((i) => ({
    Data: i.dataRequisicao.toLocaleDateString("pt-BR"),
    "Razão social": i.arquivo.ciclo.loja.grupo.razaoSocial ?? i.arquivo.ciclo.loja.grupo.nome,
    Motivo: i.motivoCodigo,
    Produto: `${i.codigoProduto} - ${i.descricaoProduto}`,
    Quantidade: Number(i.quantidadeAtendida),
    "Custo total": Number(i.custoTotal),
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Requisições");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="requisicoes-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
