import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseDevolucao } from "./devolucao";
import { StatusParsing } from "@/generated/prisma/client";

export type ResultadoImportacaoDevolucao = {
  status: "OK" | "AVISO" | "ERRO";
  mensagem: string;
};

/**
 * Processa um upload do relatório de devoluções (usado tanto pelo módulo
 * de Defeitos quanto pela Central de Importação). Cria uma nota por NF
 * (deduplicada por loja+número), cada uma com seus itens - nunca recria
 * uma NF que já existe de uma importação anterior.
 */
export async function importarArquivoDevolucao(
  buffer: Buffer,
  nomeArquivo: string,
  tipoMime: string,
  uploadedByUserId: string
): Promise<ResultadoImportacaoDevolucao> {
  const hashConteudo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.arquivoDevolucao.findUnique({ where: { hashConteudo } });
  if (duplicado) {
    return {
      status: "ERRO",
      mensagem: `Esse arquivo já foi importado antes (${duplicado.nomeArquivo}).`,
    };
  }

  const resultado = parseDevolucao(buffer);
  const avisos = [...resultado.avisos];
  let notasCriadas = 0;

  await prisma.$transaction(async (tx) => {
    const arquivo = await tx.arquivoDevolucao.create({
      data: {
        nomeArquivo,
        tipoMime,
        hashConteudo,
        tamanhoBytes: buffer.length,
        conteudo: buffer,
        uploadedByUserId,
        statusParsing: resultado.linhas.length === 0 ? StatusParsing.ERRO : StatusParsing.PENDENTE,
      },
    });

    for (const nota of resultado.linhas) {
      const loja = await tx.loja.findUnique({ where: { pdv: nota.lojaPdv } });
      if (!loja) {
        avisos.push(`NF ${nota.numeroDocumento}: loja com PDV ${nota.lojaPdv} não encontrada, ignorada.`);
        continue;
      }

      const existente = await tx.defeito.findUnique({
        where: { lojaId_numeroNotaFiscal: { lojaId: loja.id, numeroNotaFiscal: nota.numeroDocumento } },
      });
      if (existente) {
        avisos.push(`NF ${nota.numeroDocumento} (loja ${nota.lojaPdv}) já existia, ignorada nesta importação.`);
        continue;
      }

      await tx.defeito.create({
        data: {
          lojaId: loja.id,
          arquivoDevolucaoId: arquivo.id,
          numeroNotaFiscal: nota.numeroDocumento,
          fornecedorNome: nota.fornecedorNome,
          dataEnvio: nota.dataEmissao,
          valorEnviado: nota.valorTotalNota.replace(/^-/, ""),
          createdByUserId: uploadedByUserId,
          itens: {
            create: nota.itens.map((i) => ({
              codigoProduto: i.codigoProduto,
              descricaoProduto: i.descricaoProduto,
              unidade: i.unidade,
              quantidade: i.quantidade,
              valorTotalItem: i.valorTotalItem,
            })),
          },
        },
      });
      notasCriadas++;
    }

    await tx.arquivoDevolucao.update({
      where: { id: arquivo.id },
      data: {
        statusParsing: avisos.length > 0 ? StatusParsing.AVISO : StatusParsing.OK,
        resumoParsing: `${notasCriadas} nota(s) criada(s), ${avisos.length} aviso(s)`,
        avisosParsing: avisos,
      },
    });
  });

  return {
    status: notasCriadas === 0 ? "ERRO" : avisos.length > 0 ? "AVISO" : "OK",
    mensagem: `${notasCriadas} nota(s) de devolução criada(s)${avisos.length > 0 ? ` — ${avisos.join(" | ")}` : ""}`,
  };
}
