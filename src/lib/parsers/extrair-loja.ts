import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { parseCsvRelatorio, pick } from "./util";
import { CategoriaArquivo } from "@/generated/prisma/client";

/**
 * Pra rotear um arquivo sozinho (central de importação) pra loja/ciclo
 * certo, precisamos saber de qual loja (PDV) ele é. Cada formato guarda
 * essa informação num lugar diferente - alguns na própria linha de dados,
 * o PDF de ajuste no cabeçalho do relatório, o xls de faturamento numa aba
 * separada de parâmetros.
 */
export async function extrairLojaPdv(
  categoria: CategoriaArquivo,
  buffer: Buffer
): Promise<number | null> {
  switch (categoria) {
    case CategoriaArquivo.INVENTARIO: {
      const linhas = parseCsvRelatorio(buffer);
      const texto = pick(linhas[0] ?? {}, ["Loja"]);
      const m = texto.match(/^\d+/);
      return m ? Number(m[0]) : null;
    }

    case CategoriaArquivo.TRANSFERENCIA_ENTRADA: {
      const linhas = parseCsvRelatorio(buffer);
      const texto = pick(linhas[0] ?? {}, ["Código da Loja"]);
      return texto ? Number(texto) : null;
    }

    case CategoriaArquivo.TRANSFERENCIA_SAIDA: {
      const linhas = parseCsvRelatorio(buffer);
      const texto = pick(linhas[0] ?? {}, ["Loja"]);
      const m = texto.match(/^\d+/);
      return m ? Number(m[0]) : null;
    }

    case CategoriaArquivo.AJUSTE: {
      const parser = new PDFParse({ data: buffer });
      try {
        const resultado = await parser.getText();
        const m = resultado.text.match(/Lojas:\s*\[(\d+)/);
        return m ? Number(m[1]) : null;
      } finally {
        await parser.destroy();
      }
    }

    case CategoriaArquivo.FATURAMENTO: {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const nomeAba = workbook.SheetNames.find((n) => n.toLowerCase().includes("parâmetro") || n.toLowerCase().includes("parametro"));
      if (!nomeAba) return null;
      const linhas: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[nomeAba], {
        header: 1,
        defval: "",
      });
      for (const linha of linhas) {
        const [colA, colB] = linha;
        if (typeof colA === "string" && colA.toLowerCase().startsWith("lojas")) {
          const texto = String(colB).trim();
          const m = texto.match(/^\d+/);
          return m ? Number(m[0]) : null;
        }
      }
      return null;
    }

    case CategoriaArquivo.REQUISICAO:
      // o relatorio de requisicao so' traz a razao social do grupo, nao o
      // PDV - nao da pra resolver a loja automaticamente a partir do
      // conteudo (ver docs/BRIEFING.md, item 6).
      return null;
  }
}
