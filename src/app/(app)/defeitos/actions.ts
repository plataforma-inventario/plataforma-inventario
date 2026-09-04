"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { registrarAlteracoes } from "@/lib/log-alteracao";
import { parseDevolucao } from "@/lib/parsers/devolucao";
import { StatusParsing, StatusReembolso, TipoDevolucao } from "@/generated/prisma/client";

export async function uploadDevolucao(
  _prevState: { erro?: string; aviso?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string; aviso?: string }> {
  const session = await requireAuditor();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hashConteudo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.arquivoDevolucao.findUnique({ where: { hashConteudo } });
  if (duplicado) {
    return {
      erro: `Esse arquivo já foi importado antes (${duplicado.nomeArquivo}). Reenviar o mesmo arquivo geraria notas em dobro.`,
    };
  }

  const resultado = parseDevolucao(buffer);
  const avisos = [...resultado.avisos];

  await prisma.$transaction(async (tx) => {
    const arquivo = await tx.arquivoDevolucao.create({
      data: {
        nomeArquivo: file.name,
        tipoMime: file.type || "text/csv",
        hashConteudo,
        tamanhoBytes: file.size,
        conteudo: buffer,
        uploadedByUserId: session.user.id,
        statusParsing: resultado.linhas.length === 0 ? StatusParsing.ERRO : StatusParsing.PENDENTE,
      },
    });

    let notasCriadas = 0;
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
          valorEnviado: nota.valorTotalNota.replace(/^-/, ""), // guardamos como magnitude positiva
          createdByUserId: session.user.id,
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

  revalidatePath("/defeitos");
  return avisos.length > 0 ? { aviso: avisos.join(" | ") } : {};
}

export async function classificarTipoDevolucao(defeitoId: string, tipo: TipoDevolucao) {
  const session = await requireAuditor();

  await prisma.$transaction(async (tx) => {
    const antes = await tx.defeito.findUniqueOrThrow({ where: { id: defeitoId } });
    await tx.defeito.update({ where: { id: defeitoId }, data: { tipoDevolucao: tipo } });
    await registrarAlteracoes(tx, {
      tabela: "Defeito",
      registroId: defeitoId,
      usuarioId: session.user.id,
      motivo: "Classificação do tipo de devolução",
      antes: { tipoDevolucao: antes.tipoDevolucao },
      depois: { tipoDevolucao: tipo },
    });
  });

  revalidatePath("/defeitos");
}

export async function atualizarReembolso(defeitoId: string, formData: FormData) {
  const session = await requireAuditor();

  const statusReembolso = String(formData.get("statusReembolso")) as StatusReembolso;
  const valorReembolsadoTexto = String(formData.get("valorReembolsado") ?? "0").trim() || "0";
  const dataRecebimentoTexto = String(formData.get("dataRecebimentoReembolso") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || "Atualização de status de reembolso";

  const depois = {
    statusReembolso,
    valorReembolsado: valorReembolsadoTexto,
    dataRecebimentoReembolso: dataRecebimentoTexto ? new Date(`${dataRecebimentoTexto}T00:00:00`) : null,
  };

  await prisma.$transaction(async (tx) => {
    const antes = await tx.defeito.findUniqueOrThrow({ where: { id: defeitoId } });

    await tx.defeito.update({ where: { id: defeitoId }, data: depois });

    await registrarAlteracoes(tx, {
      tabela: "Defeito",
      registroId: defeitoId,
      usuarioId: session.user.id,
      motivo,
      antes: {
        statusReembolso: antes.statusReembolso,
        valorReembolsado: antes.valorReembolsado.toString(),
        dataRecebimentoReembolso: antes.dataRecebimentoReembolso?.toISOString() ?? null,
      },
      depois: {
        statusReembolso: depois.statusReembolso,
        valorReembolsado: depois.valorReembolsado,
        dataRecebimentoReembolso: depois.dataRecebimentoReembolso?.toISOString() ?? null,
      },
    });
  });

  revalidatePath("/defeitos");
}

export async function criarInsucesso(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const lojaId = String(formData.get("lojaId") ?? "");
  const dataTexto = String(formData.get("data") ?? "");
  const numeroNotaFiscal = String(formData.get("numeroNotaFiscal") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim();
  const foto = formData.get("foto");

  if (!lojaId || !dataTexto || !observacao) {
    return { erro: "Preencha loja, data e observação." };
  }

  let fotoBuffer: Buffer | null = null;
  let fotoTipoMime: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    fotoBuffer = Buffer.from(await foto.arrayBuffer());
    fotoTipoMime = foto.type || "image/jpeg";
  }

  await prisma.insucesso.create({
    data: {
      lojaId,
      data: new Date(`${dataTexto}T00:00:00`),
      numeroNotaFiscal,
      observacao,
      fotoCaixa: fotoBuffer,
      fotoCaixaTipoMime: fotoTipoMime,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath("/defeitos");
  return {};
}
