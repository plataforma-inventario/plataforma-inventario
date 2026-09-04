import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { getTransferencias } from "@/lib/relatorios";
import type { DirecaoMovimento, TipoLoja } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const url = new URL(request.url);
  const { itens } = await getTransferencias(session.user, {
    lojaId: url.searchParams.get("loja") ?? undefined,
    mes: url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : undefined,
    ano: url.searchParams.get("ano") ? Number(url.searchParams.get("ano")) : undefined,
    cicloId: url.searchParams.get("cicloId") ?? undefined,
    tipoLoja: (url.searchParams.get("tipo") as TipoLoja) ?? undefined,
    direcao: (url.searchParams.get("direcao") as DirecaoMovimento) ?? undefined,
  });

  const dados = itens.map((i) => ({
    Data: i.dataEmissao.toLocaleDateString("pt-BR"),
    PDV: i.arquivo.ciclo.loja.pdv,
    Loja: i.arquivo.ciclo.loja.nome,
    Direção: i.direcao === "ENTRADA" ? "Entrada" : "Saída",
    Documento: i.numeroDocumento,
    Contraparte: `${i.contraparteCodigo} - ${i.contraparteNome}`,
    Produto: `${i.codigoProduto} - ${i.descricaoProduto}`,
    Quantidade: Number(i.quantidade),
    "Valor total": Number(i.valorTotalItem),
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Transferências");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transferencias-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
