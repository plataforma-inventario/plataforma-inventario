import { parseCsvRelatorio, pick } from "./util";
import { CategoriaArquivo } from "@/generated/prisma/client";

export type TipoDetectado =
  | { tipo: CategoriaArquivo | "DEVOLUCAO" | "LOGISTICA_REVERSA" }
  | { tipo: "DESCONHECIDO"; motivo: string };

// CFOPs usados no relatório de logística reversa (material pós-consumo pra
// cooperativa de reciclagem) - o resto do CFOP 5xxx/6xxx nesse formato
// ("venda") é transferência real entre lojas (5152).
const CFOPS_LOGISTICA_REVERSA = new Set(["5949", "6949"]);

/**
 * Central de importação: identifica sozinho qual dos formatos conhecidos um
 * arquivo é, pra rotear pro lugar certo sem o usuário precisar escolher a
 * categoria manualmente. PDF e XLS têm um único uso conhecido no sistema;
 * CSV precisa olhar as colunas (e, no caso do formato "compra", também o
 * conteúdo da coluna Operação, já que Transferência Entrada e Devolução
 * usam exatamente o mesmo cabeçalho).
 */
export function detectarTipoArquivo(buffer: Buffer, nomeArquivo: string): TipoDetectado {
  const extensao = nomeArquivo.toLowerCase().split(".").pop();

  if (extensao === "pdf") return { tipo: CategoriaArquivo.AJUSTE };
  if (extensao === "xls" || extensao === "xlsx") return { tipo: CategoriaArquivo.FATURAMENTO };

  if (extensao !== "csv") {
    return { tipo: "DESCONHECIDO", motivo: `Extensão ".${extensao}" não reconhecida.` };
  }

  let linhas: Record<string, string>[];
  try {
    linhas = parseCsvRelatorio(buffer);
  } catch {
    return { tipo: "DESCONHECIDO", motivo: "Não foi possível ler o CSV (verifique o formato)." };
  }
  if (linhas.length === 0) {
    return { tipo: "DESCONHECIDO", motivo: "CSV sem linhas de dados." };
  }

  const primeira = linhas[0];
  const colunas = new Set(Object.keys(primeira).map((c) => c.trim().toLowerCase()));

  if (colunas.has("congelado") && colunas.has("digitado")) {
    return { tipo: CategoriaArquivo.INVENTARIO };
  }
  if (colunas.has("solicitante") && colunas.has("motivo")) {
    return { tipo: CategoriaArquivo.REQUISICAO };
  }
  if (colunas.has("cliente") && colunas.has("chave")) {
    // formato "venda" - nunca mistura venda real ao consumidor (usuario
    // confirmou), mas cobre dois casos com o mesmo cabecalho: transferencia
    // de saida entre lojas (CFOP 5152) e logistica reversa - material
    // pos-consumo pra cooperativa de reciclagem (CFOP 5949/6949).
    const cfop = pick(primeira, ["CFOP"]);
    if (CFOPS_LOGISTICA_REVERSA.has(cfop)) return { tipo: "LOGISTICA_REVERSA" };
    return { tipo: CategoriaArquivo.TRANSFERENCIA_SAIDA };
  }
  if (colunas.has("código do fornecedor") || colunas.has("codigo do fornecedor")) {
    // formato "compra" - Transferencia Entrada e Devolucao usam o mesmo
    // cabecalho, so' a coluna Operação diferencia
    const operacao = pick(primeira, ["Operação", "Operacao"]).toUpperCase();
    if (operacao.includes("DEVOLU")) return { tipo: "DEVOLUCAO" };
    return { tipo: CategoriaArquivo.TRANSFERENCIA_ENTRADA };
  }

  return { tipo: "DESCONHECIDO", motivo: "Nenhum formato conhecido bateu com as colunas desse CSV." };
}
