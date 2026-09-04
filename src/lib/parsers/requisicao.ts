import {
  parseCsvRelatorio,
  parseDataBr,
  parseDecimalBr,
  pick,
  splitCodigoDescricao,
  type ResultadoParsing,
} from "./util";

export type LinhaRequisicao = {
  numero: string;
  setor: string | null;
  solicitante: string | null;
  codigoProduto: string;
  descricaoProduto: string;
  unidade: string;
  quantidadeAtendida: string;
  custoTotal: string;
  dataRequisicao: Date;
  motivoCodigo: string;
  observacao: string | null;
};

export function parseRequisicao(buffer: Buffer): ResultadoParsing<LinhaRequisicao> {
  const linhasCsv = parseCsvRelatorio(buffer);
  const linhas: LinhaRequisicao[] = [];
  const avisos: string[] = [];

  linhasCsv.forEach((row, i) => {
    const numeroLinha = i + 2;
    const numero = pick(row, ["Número"]);
    const dataRequisicao = parseDataBr(pick(row, ["Data Requisição"]));

    if (!numero || !dataRequisicao) {
      avisos.push(`Linha ${numeroLinha}: sem número ou data de requisição válida, ignorada.`);
      return;
    }

    const produto = splitCodigoDescricao(pick(row, ["Produto"]));
    if (!produto.codigo) {
      avisos.push(`Linha ${numeroLinha}: sem código de produto identificável, ignorada.`);
      return;
    }

    const motivoCodigo = pick(row, ["Motivo"]);
    if (!motivoCodigo) {
      avisos.push(`Linha ${numeroLinha}: sem motivo preenchido.`);
    }

    linhas.push({
      numero,
      setor: pick(row, ["Setor"]) || null,
      solicitante: pick(row, ["Solicitante"]) || null,
      codigoProduto: produto.codigo,
      descricaoProduto: produto.descricao,
      unidade: pick(row, ["Unidade de Medida"]),
      quantidadeAtendida: parseDecimalBr(pick(row, ["Quantidade Atendida"])),
      custoTotal: parseDecimalBr(pick(row, ["Custo Total"])),
      dataRequisicao,
      motivoCodigo,
      observacao: pick(row, ["Observação"]) || null,
    });
  });

  if (linhas.length === 0) avisos.push("Nenhuma linha reconhecida no arquivo.");

  return { linhas, avisos };
}
