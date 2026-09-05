import { PDFParse } from "pdf-parse";

/** Extrai o texto puro de um PDF - usado tanto pra detectar o tipo quanto pra parsear o conteúdo. */
export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    return resultado.text;
  } finally {
    await parser.destroy();
  }
}
