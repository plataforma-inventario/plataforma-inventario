import { CategoriaArquivo, StatusParsing, type Prisma } from "@/generated/prisma/client";
import { parseInventario } from "./inventario";
import { parseTransferencia } from "./transferencia";
import { parseAjuste } from "./ajuste";
import { parseRequisicao } from "./requisicao";
import { parseFaturamento } from "./faturamento";
import { DirecaoMovimento } from "@/generated/prisma/client";
import type { ResultadoParsing } from "./util";

type Tx = Prisma.TransactionClient;

function resumoDe<T>(r: ResultadoParsing<T>): {
  status: StatusParsing;
  resumo: string;
  avisos: string[];
} {
  const status =
    r.linhas.length === 0 ? StatusParsing.ERRO : r.avisos.length > 0 ? StatusParsing.AVISO : StatusParsing.OK;
  return {
    status,
    resumo: `${r.linhas.length} linha(s), ${r.avisos.length} aviso(s)`,
    avisos: r.avisos,
  };
}

/**
 * Roda o parser certo pra categoria do arquivo, grava as linhas
 * estruturadas e devolve o status pra guardar em ArquivoImportado. Nunca
 * lança para cima por erro de conteúdo do arquivo (formato inesperado etc)
 * - isso vira StatusParsing.ERRO com uma mensagem, pra não travar o upload;
 * o auditor consegue ver o erro, remover o arquivo e tentar de novo.
 */
export async function processarEArmazenar(
  tx: Tx,
  arquivoId: string,
  categoria: CategoriaArquivo,
  buffer: Buffer
): Promise<{ status: StatusParsing; resumo: string; avisos: string[] }> {
  try {
    switch (categoria) {
      case CategoriaArquivo.INVENTARIO: {
        const r = parseInventario(buffer);
        await tx.itemInventario.createMany({
          data: r.linhas.map((l) => ({ ...l, arquivoId })),
        });
        return resumoDe(r);
      }

      case CategoriaArquivo.TRANSFERENCIA_ENTRADA:
      case CategoriaArquivo.TRANSFERENCIA_SAIDA: {
        const direcao =
          categoria === CategoriaArquivo.TRANSFERENCIA_ENTRADA
            ? DirecaoMovimento.ENTRADA
            : DirecaoMovimento.SAIDA;
        const r = parseTransferencia(buffer, direcao);
        await tx.itemTransferencia.createMany({
          data: r.linhas.map((l) => ({ ...l, arquivoId })),
        });
        return resumoDe(r);
      }

      case CategoriaArquivo.AJUSTE: {
        const r = await parseAjuste(buffer);
        await tx.itemAjuste.createMany({
          data: r.linhas.map((l) => ({ ...l, arquivoId })),
        });
        return resumoDe(r);
      }

      case CategoriaArquivo.REQUISICAO: {
        const r = parseRequisicao(buffer);
        await tx.itemRequisicao.createMany({
          data: r.linhas.map((l) => ({ ...l, arquivoId })),
        });
        return resumoDe(r);
      }

      case CategoriaArquivo.FATURAMENTO: {
        const r = parseFaturamento(buffer);
        if (r.linhas.length > 0) {
          await tx.faturamento.create({ data: { ...r.linhas[0], arquivoId } });
        }
        return resumoDe(r);
      }
    }
  } catch (e) {
    return {
      status: StatusParsing.ERRO,
      resumo: "Falha ao processar o arquivo",
      avisos: [e instanceof Error ? e.message : "Erro desconhecido"],
    };
  }
}
