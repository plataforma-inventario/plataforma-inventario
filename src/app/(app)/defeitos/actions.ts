"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { registrarAlteracoes } from "@/lib/log-alteracao";
import { StatusReembolso } from "@/generated/prisma/client";

export async function criarDefeito(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const lojaId = String(formData.get("lojaId") ?? "");
  const numeroNotaFiscal = String(formData.get("numeroNotaFiscal") ?? "").trim();
  const dataEnvioTexto = String(formData.get("dataEnvio") ?? "");
  const valorEnviadoTexto = String(formData.get("valorEnviado") ?? "").trim();
  const descricaoItens = String(formData.get("descricaoItens") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!lojaId || !numeroNotaFiscal || !dataEnvioTexto || !valorEnviadoTexto) {
    return { erro: "Preencha loja, número da nota, data de envio e valor enviado." };
  }

  await prisma.defeito.create({
    data: {
      lojaId,
      numeroNotaFiscal,
      dataEnvio: new Date(`${dataEnvioTexto}T00:00:00`),
      valorEnviado: valorEnviadoTexto,
      descricaoItens,
      observacao,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath("/defeitos");
  return {};
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
