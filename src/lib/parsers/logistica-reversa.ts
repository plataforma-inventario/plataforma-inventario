import { parseCsvRelatorio, parseDataBr, parseDecimalBr, pick, type ResultadoParsing } from "./util";

export type NotaLogisticaReversa = {
  numeroDocumento: string;
  lojaPdv: number;
  dataEmissao: Date;
  valorTotalNota: string; // pego uma unica vez por NF - o mesmo valor vem repetido em toda linha da NF
};

/**
 * Relatorio de "notas fiscais de venda" (mesmo formato/cabecalho), so que
 * filtrado pra CFOP de logistica reversa (5949/6949 - material pos-consumo
 * pra cooperativa de reciclagem) em vez de transferencia entre lojas
 * (5152). Chega uma vez por mes, com TODAS as lojas juntas no mesmo
 * arquivo - diferente dos outros 6 tipos, que sao por loja/ciclo.
 */
export function parseLogisticaReversa(buffer: Buffer): ResultadoParsing<NotaLogisticaReversa> {
  const linhasCsv = parseCsvRelatorio(buffer);
  const notasPorDocumento = new Map<string, NotaLogisticaReversa>();
  const avisos: string[] = [];

  linhasCsv.forEach((row, i) => {
    const numeroLinha = i + 2;
    const numeroDocumento = pick(row, ["Documento"]);
    const lojaTexto = pick(row, ["Loja"]);
    const lojaPdvMatch = lojaTexto.match(/^\d+/);
    const dataEmissao = parseDataBr(pick(row, ["Emissão", "Emissao"]));

    if (!numeroDocumento || !lojaPdvMatch || !dataEmissao) {
      avisos.push(`Linha ${numeroLinha}: sem número de documento, loja ou data de emissão válida, ignorada.`);
      return;
    }

    if (notasPorDocumento.has(numeroDocumento)) return; // valor da NF ja capturado, so' uma vez

    notasPorDocumento.set(numeroDocumento, {
      numeroDocumento,
      lojaPdv: Number(lojaPdvMatch[0]),
      dataEmissao,
      valorTotalNota: parseDecimalBr(pick(row, ["Valor"])),
    });
  });

  const notas = Array.from(notasPorDocumento.values());
  if (notas.length === 0) avisos.push("Nenhuma nota de logística reversa reconhecida no arquivo.");

  return { linhas: notas, avisos };
}
