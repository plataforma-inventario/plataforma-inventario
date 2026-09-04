import { PDFParse } from "pdf-parse";
import { parseDataBr, parseDecimalBr, type ResultadoParsing } from "./util";
import { DirecaoMovimento } from "@/generated/prisma/client";

export type LinhaAjuste = {
  direcao: DirecaoMovimento;
  dataMovimento: Date;
  codigoProduto: string;
  descricaoProduto: string;
  quantidade: string;
  custoUnitario: string;
  valorTotalCusto: string;
  funcionario: string | null;
  observacao: string | null;
};

const DATA_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const PRODUTO_REGEX = /^(\d{6,})\s*-\s*(.+)$/;
// "01 - GERAL 2 -5,000 5,20 -26,00 39,90 -199,50 229 - JULYO" (Local, Tipo Ajuste,
// Quantidade, Cst Reposição, Total Custo, Prc Venda, Total Venda, Funcionário)
const DETALHE_REGEX =
  /^\d+\s*-\s*\S+\s+([12])\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+-?[\d.,]+\s+-?[\d.,]+\s+(\d+\s*-\s*.+)$/;

function strip(valor: string): string {
  return parseDecimalBr(valor).replace(/^-/, "");
}

/**
 * O relatorio de ajustes (PDF) e um texto posicional, nao uma tabela real -
 * cada registro sai em 3 a 4 linhas (data do bloco, produto, linha de
 * detalhe, observação opcional). Ver docs/BRIEFING.md e a memoria do
 * projeto para o formato real observado num arquivo de exemplo.
 */
export function parseAjuste(buffer: Buffer): Promise<ResultadoParsing<LinhaAjuste>> {
  return extrairTexto(buffer).then((texto) => {
    const linhas: LinhaAjuste[] = [];
    const avisos: string[] = [];

    let dataAtual: Date | null = null;
    let produtoAtual: { codigo: string; descricao: string } | null = null;
    let ultimoRegistro: LinhaAjuste | null = null;

    for (const linhaTexto of texto.split("\n").map((l) => l.trim())) {
      if (!linhaTexto) continue;

      const matchData = linhaTexto.match(DATA_REGEX);
      if (matchData) {
        dataAtual = parseDataBr(linhaTexto);
        produtoAtual = null;
        continue;
      }

      const matchProduto = linhaTexto.match(PRODUTO_REGEX);
      if (matchProduto) {
        produtoAtual = { codigo: matchProduto[1], descricao: matchProduto[2].trim() };
        continue;
      }

      const matchDetalhe = linhaTexto.match(DETALHE_REGEX);
      if (matchDetalhe) {
        if (!dataAtual || !produtoAtual) {
          avisos.push(`Linha de ajuste ignorada (sem data/produto associado): "${linhaTexto}"`);
          continue;
        }
        const [, tipoAjuste, quantidade, custoUnitario, valorTotalCusto, funcionarioBruto] = matchDetalhe;
        // a extração posicional do PDF empurra o código da loja pro fim da linha,
        // separado por tab, depois do nome do funcionário - descartamos aqui.
        const funcionario = funcionarioBruto.split("\t")[0].trim();
        ultimoRegistro = {
          direcao: tipoAjuste === "1" ? DirecaoMovimento.ENTRADA : DirecaoMovimento.SAIDA,
          dataMovimento: dataAtual,
          codigoProduto: produtoAtual.codigo,
          descricaoProduto: produtoAtual.descricao,
          quantidade: strip(quantidade),
          custoUnitario: strip(custoUnitario),
          valorTotalCusto: strip(valorTotalCusto),
          funcionario: funcionario.trim() || null,
          observacao: null,
        };
        linhas.push(ultimoRegistro);
        continue;
      }

      if (linhaTexto.startsWith("Observação:") && ultimoRegistro) {
        ultimoRegistro.observacao = linhaTexto.replace(/^Observação:\s*/, "").trim();
        continue;
      }

      // demais linhas (cabecalho, rodape, "Total dia:", "Total:") sao ignoradas de proposito
    }

    if (linhas.length === 0) {
      avisos.push("Nenhum lançamento de ajuste reconhecido no PDF.");
    }

    return { linhas, avisos };
  });
}

async function extrairTexto(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    return resultado.text;
  } finally {
    await parser.destroy();
  }
}
