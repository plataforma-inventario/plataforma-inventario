import iconv from "iconv-lite";
import { parse as parseCsvSync } from "csv-parse/sync";

/**
 * Os relatorios exportados pelo sistema da loja (RetaguardaGB) vem em
 * cp1252/latin1, nao UTF-8 - decodificar como UTF-8 direto corrompe
 * acentos ("Código" vira "C�digo"). Point-e-virgula como delimitador.
 */
export function parseCsvRelatorio(buffer: Buffer): Record<string, string>[] {
  const texto = iconv.decode(buffer, "win1252");
  return parseCsvSync(texto, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

/** "1.234,56" -> "1234.56" (string pronta para Prisma Decimal). "" -> "0". */
export function parseDecimalBr(valor: string | undefined): string {
  if (!valor || valor.trim() === "") return "0";
  return valor.trim().replaceAll(".", "").replace(",", ".");
}

/** "26/08/2026" -> Date. Retorna null se nao bater o formato. */
export function parseDataBr(valor: string | undefined): Date | null {
  if (!valor) return null;
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return new Date(`${ano}-${mes}-${dia}T00:00:00`);
}

/** "2026-08-27 17:12:33.216036" ou "2026-08-26 00:00:00" -> Date. */
export function parseDataIso(valor: string | undefined): Date | null {
  if (!valor) return null;
  const normalizado = valor.trim().replace(" ", "T");
  const d = new Date(normalizado);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "52040 - REF BOTI BABY LOC HID CPO 350ml" -> { codigo: "52040", descricao: "REF BOTI..." } */
export function splitCodigoDescricao(valor: string): { codigo: string; descricao: string } {
  const idx = valor.indexOf(" - ");
  if (idx === -1) return { codigo: "", descricao: valor.trim() };
  return { codigo: valor.slice(0, idx).trim(), descricao: valor.slice(idx + 3).trim() };
}

export type ResultadoParsing<T> = {
  linhas: T[];
  avisos: string[];
};

/**
 * Busca um campo por uma lista de nomes possiveis de coluna, ignorando
 * maiusculas/minusculas e espacos nas pontas - os relatorios do sistema da
 * loja variam um pouco a grafia dos cabecalhos entre exportacoes.
 */
export function pick(row: Record<string, string>, candidatos: string[]): string {
  const chaves = Object.keys(row);
  for (const candidato of candidatos) {
    const chave = chaves.find((k) => k.trim().toLowerCase() === candidato.toLowerCase());
    if (chave) return row[chave]?.trim() ?? "";
  }
  return "";
}
