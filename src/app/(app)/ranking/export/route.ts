import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { getRankingLojas } from "@/lib/ranking";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const criterio = new URL(request.url).searchParams.get("ordenarPor") === "valor" ? "valor" : "percentual";
  const linhas = await getRankingLojas(session.user, criterio);

  const dados = linhas.map((l, i) => ({
    "#": i + 1,
    PDV: l.pdv,
    Loja: l.nome,
    Região: l.regiaoNome ?? "",
    "Último lançamento": l.dataFim.toLocaleDateString("pt-BR"),
    "Divergência R$": l.divergenciaValor,
    "% sobre faturamento": l.percentualSobreFaturamento ?? "",
    "Meta %": l.metaPercentual ?? "",
    "Acima da meta": l.acimaDaMeta ? "Sim" : "Não",
    Tendência: l.tendencia,
  }));

  const planilha = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, planilha, "Ranking");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ranking-lojas-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
