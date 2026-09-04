import { parseCsvRelatorio, parseDecimalBr, type ResultadoParsing } from "./util";
import { TipoInventario } from "@/generated/prisma/client";

export type LinhaInventario = {
  codigoProduto: string;
  descricaoProduto: string;
  unidade: string;
  quantidadeSistema: string;
  quantidadeContada: string;
  ajuste: string;
  custoUnitario: string;
  valorAjuste: string;
  valorEstoque: string;
  lojaOrigemTexto: string;
  local: string | null;
  tipoArquivo: TipoInventario;
};

export function parseInventario(buffer: Buffer): ResultadoParsing<LinhaInventario> {
  const linhasCsv = parseCsvRelatorio(buffer);
  const linhas: LinhaInventario[] = [];
  const avisos: string[] = [];

  linhasCsv.forEach((row, i) => {
    const numeroLinha = i + 2; // +1 cabecalho, +1 index base 1
    const codigoProduto = row["Código do Produto"]?.trim();
    if (!codigoProduto) {
      avisos.push(`Linha ${numeroLinha}: sem código de produto, ignorada.`);
      return;
    }

    const tipoTexto = row["Tipo"]?.trim().toUpperCase();
    let tipoArquivo: TipoInventario;
    if (tipoTexto === "COMPLETO") tipoArquivo = TipoInventario.COMPLETO;
    else if (tipoTexto === "CICLICO" || tipoTexto === "CÍCLICO") tipoArquivo = TipoInventario.CICLICO;
    else {
      tipoArquivo = TipoInventario.CICLICO;
      avisos.push(
        `Linha ${numeroLinha}: tipo de inventário "${row["Tipo"]}" não reconhecido, assumido como Cíclico.`
      );
    }

    linhas.push({
      codigoProduto,
      descricaoProduto: row["Descrição do Produto"]?.trim() ?? "",
      unidade: row["Emb"]?.trim() ?? "",
      quantidadeSistema: parseDecimalBr(row["Congelado"]),
      quantidadeContada: parseDecimalBr(row["Digitado"]),
      ajuste: parseDecimalBr(row["Ajuste"]),
      custoUnitario: parseDecimalBr(row["Custo"]),
      valorAjuste: parseDecimalBr(row["Valor de Ajuste(R$)"]),
      valorEstoque: parseDecimalBr(row["Valor de Estoque(R$)"]),
      lojaOrigemTexto: row["Loja"]?.trim() ?? "",
      local: row["Local"]?.trim() || null,
      tipoArquivo,
    });
  });

  if (linhas.length === 0) avisos.push("Nenhuma linha reconhecida no arquivo.");

  return { linhas, avisos };
}
