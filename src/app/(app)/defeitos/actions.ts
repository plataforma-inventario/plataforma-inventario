"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { registrarAlteracoes } from "@/lib/log-alteracao";
import { importarArquivoDevolucao } from "@/lib/parsers/processar-devolucao";
import { StatusReembolso, TipoDevolucao } from "@/generated/prisma/client";

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
  const resultado = await importarArquivoDevolucao(
    buffer,
    file.name,
    file.type || "text/csv",
    session.user.id
  );

  revalidatePath("/defeitos");
  if (resultado.status === "ERRO") return { erro: resultado.mensagem };
  if (resultado.status === "AVISO") return { aviso: resultado.mensagem };
  return {};
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

  let fotoBuffer: Buffer<ArrayBuffer> | null = null;
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
