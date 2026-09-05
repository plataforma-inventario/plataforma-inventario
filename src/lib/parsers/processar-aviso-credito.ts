import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extrairTextoPdf } from "./extrair-texto-pdf";
import { parseAvisoCredito } from "./aviso-credito";
import { registrarAlteracoes } from "@/lib/log-alteracao";
import { StatusParsing, StatusReembolso } from "@/generated/prisma/client";

export type ResultadoImportacaoAvisoCredito = {
  status: "OK" | "AVISO" | "ERRO";
  mensagem: string;
};

const EPSILON = 0.01;

/**
 * Cruza o Aviso de Crédito (PDF) com os Defeitos já lançados (mesmo número
 * de NF) e atualiza o reembolso sozinho - sem o auditor digitar valor,
 * data e status manualmente. Se a mesma NF já recebeu crédito antes, soma
 * (reembolso parcial ao longo do tempo, até completar o valor enviado).
 *
 * `lojaId` é opcional (combinado com o usuário em 2026-09-04): o PDF não
 * traz um PDV confiável, então por padrão cruza só pelo número da NF em
 * todas as lojas - se achar a mesma NF em mais de uma loja, não arrisca
 * adivinhar, só avisa. Informando `lojaId` (upload dedicado da tela de
 * Defeitos), a busca já fica restrita a essa loja, eliminando o risco de
 * colisão de vez.
 */
export async function importarArquivoAvisoCredito(
  buffer: Buffer<ArrayBuffer>,
  nomeArquivo: string,
  tipoMime: string,
  uploadedByUserId: string,
  lojaId?: string
): Promise<ResultadoImportacaoAvisoCredito> {
  const hashConteudo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.arquivoAvisoCredito.findUnique({ where: { hashConteudo } });
  if (duplicado) {
    return { status: "ERRO", mensagem: `Esse arquivo já foi importado antes (${duplicado.nomeArquivo}).` };
  }

  const texto = await extrairTextoPdf(buffer);
  const resultado = parseAvisoCredito(texto);
  const avisos = [...resultado.avisos];

  if (!resultado.dataAviso || resultado.creditos.length === 0) {
    await prisma.arquivoAvisoCredito.create({
      data: {
        nomeArquivo, tipoMime, hashConteudo, tamanhoBytes: buffer.length, conteudo: buffer,
        uploadedByUserId, statusParsing: StatusParsing.ERRO,
        resumoParsing: "Não foi possível ler data/créditos do PDF.", avisosParsing: avisos,
      },
    });
    return { status: "ERRO", mensagem: "Não foi possível ler a data ou os créditos do PDF." };
  }

  let atualizados = 0;

  await prisma.$transaction(
    async (tx) => {
      const arquivo = await tx.arquivoAvisoCredito.create({
        data: {
          nomeArquivo, tipoMime, hashConteudo, tamanhoBytes: buffer.length, conteudo: buffer,
          uploadedByUserId, statusParsing: StatusParsing.PENDENTE,
        },
      });

      for (const credito of resultado.creditos) {
        const defeitos = await tx.defeito.findMany({
          where: { numeroNotaFiscal: credito.numeroNotaFiscal, ...(lojaId ? { lojaId } : {}) },
        });

        if (defeitos.length === 0) {
          avisos.push(`NF ${credito.numeroNotaFiscal}: não encontrada em Defeitos, ignorada.`);
          continue;
        }
        if (defeitos.length > 1) {
          avisos.push(
            `NF ${credito.numeroNotaFiscal}: encontrada em mais de uma loja, ignorada — resolva manualmente ou reenvie informando a loja certa.`
          );
          continue;
        }

        const defeito = defeitos[0];
        const novoValorReembolsado = Number(defeito.valorReembolsado) + Number(credito.valor);
        const statusReembolso =
          novoValorReembolsado >= Number(defeito.valorEnviado) - EPSILON
            ? StatusReembolso.INTEGRAL
            : StatusReembolso.PARCIAL;

        await tx.defeito.update({
          where: { id: defeito.id },
          data: {
            valorReembolsado: novoValorReembolsado,
            dataRecebimentoReembolso: resultado.dataAviso!,
            statusReembolso,
            avisoCreditoOrigemId: arquivo.id,
          },
        });

        await registrarAlteracoes(tx, {
          tabela: "Defeito",
          registroId: defeito.id,
          usuarioId: uploadedByUserId,
          motivo: `Reembolso atualizado automaticamente pelo Aviso de Crédito (${nomeArquivo})`,
          antes: {
            valorReembolsado: defeito.valorReembolsado.toString(),
            statusReembolso: defeito.statusReembolso,
            dataRecebimentoReembolso: defeito.dataRecebimentoReembolso?.toISOString() ?? null,
          },
          depois: {
            valorReembolsado: novoValorReembolsado.toString(),
            statusReembolso,
            dataRecebimentoReembolso: resultado.dataAviso!.toISOString(),
          },
        });

        atualizados++;
      }

      const status = avisos.length > 0 ? StatusParsing.AVISO : StatusParsing.OK;
      const resumo = `${atualizados} defeito(s) atualizado(s) de ${resultado.creditos.length} crédito(s) no PDF`;
      await tx.arquivoAvisoCredito.update({
        where: { id: arquivo.id },
        data: { statusParsing: status, resumoParsing: resumo, avisosParsing: avisos },
      });
    },
    { timeout: 20000 }
  );

  return {
    status: avisos.length > 0 ? "AVISO" : "OK",
    mensagem: `${atualizados} defeito(s) atualizado(s) de ${resultado.creditos.length} crédito(s) no PDF${
      avisos.length > 0 ? `, ${avisos.length} aviso(s)` : ""
    }.`,
  };
}
