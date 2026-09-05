import { parseDecimalBr } from "./util";

export type CreditoAvisoCredito = {
  numeroNotaFiscal: string; // "000000439-001" -> "439", já sem zeros à esquerda nem o sufixo
  valor: string;
};

export type ResultadoAvisoCredito = {
  dataAviso: Date | null;
  creditos: CreditoAvisoCredito[];
  avisos: string[];
};

const DATA_REGEX = /(\d{2})\/(\d{2})\/(\d{4})/;
// "000000439-001 R$ 9,00 DEVOLUÇÃO DE MERCADORIA" - só as linhas de devolução
// de mercadoria interessam; "Lçto G/L Manual" (lançamento manual, sem NF
// associada) e outros motivos são ignorados.
const LINHA_CREDITO_REGEX = /(\d{6,})-\d{1,4}\s+R\$\s*([\d.,]+)\s+DEVOLUÇÃO DE MERCADORIA/gi;

/**
 * "Aviso de Crédito" do Boticário (PDF nativo, não digitalizado): avisa
 * quando o reembolso de uma ou mais NFs de devolução foi concedido, com a
 * data e o valor de cada uma. Recebe o texto já extraído do PDF (não o
 * buffer), pra reaproveitar a extração já feita na detecção do tipo.
 */
export function parseAvisoCredito(textoPdf: string): ResultadoAvisoCredito {
  const avisos: string[] = [];

  const dataMatch = textoPdf.match(DATA_REGEX);
  const dataAviso = dataMatch
    ? new Date(`${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}T00:00:00`)
    : null;
  if (!dataAviso) avisos.push("Não encontrei a data do aviso no PDF.");

  const creditos: CreditoAvisoCredito[] = [];
  for (const match of textoPdf.matchAll(LINHA_CREDITO_REGEX)) {
    const numeroNotaFiscal = String(Number(match[1])); // remove zeros à esquerda
    creditos.push({ numeroNotaFiscal, valor: parseDecimalBr(match[2]) });
  }

  if (creditos.length === 0) {
    avisos.push("Nenhuma linha de devolução de mercadoria reconhecida no PDF.");
  }

  return { dataAviso, creditos, avisos };
}
