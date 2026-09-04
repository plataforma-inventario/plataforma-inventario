import * as XLSX from "xlsx";
import type { ResultadoParsing } from "./util";

export type LinhaFaturamento = {
  receitaLiquida: string;
  periodoTexto: string;
};

const LINHAS_IGNORADAS = ["total venda:", "total geral:"];

export function parseFaturamento(buffer: Buffer): ResultadoParsing<LinhaFaturamento> {
  const avisos: string[] = [];
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const nomeAba =
    workbook.SheetNames.find((n) => n.toLowerCase().includes("relat")) ?? workbook.SheetNames[0];
  const planilha = workbook.Sheets[nomeAba];
  if (!planilha) {
    return { linhas: [], avisos: ["Não foi possível identificar a aba de dados na planilha."] };
  }

  const linhasBrutas: unknown[][] = XLSX.utils.sheet_to_json(planilha, {
    header: 1,
    defval: "",
  });

  let receitaTotal = 0;
  const periodos: string[] = [];

  for (const linha of linhasBrutas) {
    const [colA, colB, colC] = linha;
    if (colA !== "" || typeof colB !== "string") continue;
    const rotulo = colB.trim().toLowerCase();
    if (LINHAS_IGNORADAS.includes(rotulo) || rotulo === "") continue;
    if (typeof colC !== "number") continue;

    receitaTotal += colC;
    periodos.push(colB.trim());
  }

  if (periodos.length === 0) {
    return {
      linhas: [],
      avisos: ["Não foi possível encontrar a Receita Líquida na planilha de faturamento."],
    };
  }

  return {
    linhas: [{ receitaLiquida: String(receitaTotal), periodoTexto: periodos.join(" + ") }],
    avisos,
  };
}
