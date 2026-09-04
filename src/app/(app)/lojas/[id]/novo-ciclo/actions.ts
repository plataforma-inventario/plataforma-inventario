"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { getDataInicioSugerida } from "@/lib/ciclo";
import { MotivoInventarioCompleto, TipoInventario } from "@/generated/prisma/client";

export async function criarCiclo(
  lojaId: string,
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const dataFim = String(formData.get("dataFim") ?? "");
  const tipoInventario = String(formData.get("tipoInventario")) as TipoInventario;
  const motivoCompleto = String(formData.get("motivoCompleto") ?? "") || null;
  const motivoDetalhe = String(formData.get("motivoDetalhe") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!dataFim) return { erro: "Informe a data do inventário." };

  const dataInicio = await getDataInicioSugerida(lojaId);
  const dataFimDate = new Date(`${dataFim}T00:00:00`);
  if (dataFimDate <= dataInicio) {
    return { erro: "A data do inventário precisa ser depois do início do período." };
  }

  if (tipoInventario === TipoInventario.COMPLETO && !motivoCompleto) {
    return { erro: "Inventário completo exige um motivo." };
  }
  if (motivoCompleto === MotivoInventarioCompleto.OUTRO && !motivoDetalhe) {
    return { erro: "Descreva o motivo em 'Outro motivo'." };
  }

  const ciclo = await prisma.ciclo.create({
    data: {
      lojaId,
      dataInicio,
      dataFim: dataFimDate,
      tipoInventario,
      motivoCompleto:
        tipoInventario === TipoInventario.COMPLETO
          ? (motivoCompleto as MotivoInventarioCompleto)
          : null,
      motivoDetalhe: tipoInventario === TipoInventario.COMPLETO ? motivoDetalhe : null,
      observacao,
      createdByUserId: session.user.id,
    },
  });

  redirect(`/ciclos/${ciclo.id}`);
}
