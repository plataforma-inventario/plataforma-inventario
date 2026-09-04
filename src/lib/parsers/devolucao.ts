import { parseCsvRelatorio, parseDataBr, parseDecimalBr, pick, type ResultadoParsing } from "./util";

export type ItemNotaDevolucao = {
  codigoProduto: string;
  descricaoProduto: string;
  unidade: string;
  quantidade: string;
  valorTotalItem: string;
};

export type NotaDevolucao = {
  numeroDocumento: string;
  lojaPdv: number;
  fornecedorNome: string;
  dataEmissao: Date;
  valorTotalNota: string; // pego uma unica vez por NF - nunca somado por linha/item
  itens: ItemNotaDevolucao[];
};

/**
 * Relatorio de devolucoes (mesmo formato do relatorio de "notas fiscais de
 * compra", com Operacao = "DEVOLUCAO DE COMPRA"). Cada linha do CSV e um
 * item da NF, mas o campo "Valor Total" vem REPETIDO em toda linha da mesma
 * nota - somar direto multiplicaria o valor da NF pelo numero de itens. Este
 * parser agrupa por numero de documento e pega o valor da NF uma unica vez.
 */
export function parseDevolucao(buffer: Buffer): ResultadoParsing<NotaDevolucao> {
  const linhasCsv = parseCsvRelatorio(buffer);
  const notasPorDocumento = new Map<string, NotaDevolucao>();
  const avisos: string[] = [];

  linhasCsv.forEach((row, i) => {
    const numeroLinha = i + 2;
    const numeroDocumento = pick(row, ["Número do Documento"]);
    const lojaPdvTexto = pick(row, ["Código da Loja"]);
    const dataEmissao = parseDataBr(pick(row, ["Data De Emissão", "Data de Emissão"]));
    const codigoProduto = pick(row, ["Código do produto"]);

    if (!numeroDocumento || !lojaPdvTexto || !dataEmissao || !codigoProduto) {
      avisos.push(`Linha ${numeroLinha}: sem número de documento, loja, data ou produto válido, ignorada.`);
      return;
    }

    let nota = notasPorDocumento.get(numeroDocumento);
    if (!nota) {
      nota = {
        numeroDocumento,
        lojaPdv: Number(lojaPdvTexto),
        fornecedorNome: pick(row, ["Nome do Fornecedor"]),
        dataEmissao,
        valorTotalNota: parseDecimalBr(pick(row, ["Valor Total"])),
        itens: [],
      };
      notasPorDocumento.set(numeroDocumento, nota);
    }

    nota.itens.push({
      codigoProduto,
      descricaoProduto: pick(row, ["Descrição Produto", "Descrição do Produto"]),
      unidade: pick(row, ["Unidade de medida"]),
      quantidade: parseDecimalBr(pick(row, ["Quantidade de itens"])),
      valorTotalItem: parseDecimalBr(pick(row, ["Valor total do item"])),
    });
  });

  const notas = Array.from(notasPorDocumento.values());
  if (notas.length === 0) avisos.push("Nenhuma nota de devolução reconhecida no arquivo.");

  return { linhas: notas, avisos };
}
