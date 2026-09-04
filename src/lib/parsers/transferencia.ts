import {
  parseCsvRelatorio,
  parseDataBr,
  parseDecimalBr,
  pick,
  splitCodigoDescricao,
  type ResultadoParsing,
} from "./util";
import { DirecaoMovimento } from "@/generated/prisma/client";

export type LinhaTransferencia = {
  direcao: DirecaoMovimento;
  numeroDocumento: string;
  dataEmissao: Date;
  contraparteCodigo: string;
  contraparteNome: string;
  codigoProduto: string;
  descricaoProduto: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotalItem: string;
  cfop: string;
};

/**
 * Cobre os dois formatos reais exportados pelo sistema da loja: o relatorio
 * de "notas fiscais de compra" (usado para ENTRADA) tem colunas separadas de
 * código/descrição de produto e fornecedor; o de "venda" (usado para SAIDA)
 * combina código e nome no mesmo campo ("7134 - CP SH NUNES...").
 */
export function parseTransferencia(
  buffer: Buffer,
  direcao: DirecaoMovimento
): ResultadoParsing<LinhaTransferencia> {
  const linhasCsv = parseCsvRelatorio(buffer);
  const linhas: LinhaTransferencia[] = [];
  const avisos: string[] = [];

  linhasCsv.forEach((row, i) => {
    const numeroLinha = i + 2;

    const numeroDocumento = pick(row, ["Número do Documento", "Documento"]);
    const dataEmissaoTexto = pick(row, ["Data De Emissão", "Data de Emissão", "Emissão"]);
    const dataEmissao = parseDataBr(dataEmissaoTexto);

    if (!numeroDocumento || !dataEmissao) {
      avisos.push(`Linha ${numeroLinha}: sem número de documento ou data de emissão válida, ignorada.`);
      return;
    }

    let contraparteCodigo: string;
    let contraparteNome: string;
    let codigoProduto: string;
    let descricaoProduto: string;

    if (direcao === DirecaoMovimento.ENTRADA) {
      contraparteCodigo = pick(row, ["Código do Fornecedor"]);
      contraparteNome = pick(row, ["Nome do Fornecedor"]);
      codigoProduto = pick(row, ["Código do produto"]);
      descricaoProduto = pick(row, ["Descrição Produto", "Descrição do Produto"]);
    } else {
      const contraparte = splitCodigoDescricao(pick(row, ["Cliente"]));
      contraparteCodigo = contraparte.codigo;
      contraparteNome = contraparte.descricao;
      const produto = splitCodigoDescricao(pick(row, ["Produto"]));
      codigoProduto = produto.codigo;
      descricaoProduto = produto.descricao;
    }

    if (!codigoProduto) {
      avisos.push(`Linha ${numeroLinha}: sem código de produto identificável, ignorada.`);
      return;
    }

    linhas.push({
      direcao,
      numeroDocumento,
      dataEmissao,
      contraparteCodigo,
      contraparteNome,
      codigoProduto,
      descricaoProduto,
      unidade: pick(row, ["Unidade de medida", "Unid."]),
      quantidade: parseDecimalBr(pick(row, ["Quantidade de itens", "Qtde"])),
      valorUnitario: parseDecimalBr(pick(row, ["Valor unitário", "Valor unit."])),
      valorTotalItem: parseDecimalBr(pick(row, ["Valor total do item", "Valor do item"])),
      cfop: pick(row, ["CFOP"]),
    });
  });

  if (linhas.length === 0) avisos.push("Nenhuma linha reconhecida no arquivo.");

  return { linhas, avisos };
}
