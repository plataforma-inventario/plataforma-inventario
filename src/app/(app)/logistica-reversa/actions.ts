"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { importarArquivoLogisticaReversa } from "@/lib/parsers/processar-logistica-reversa";

export async function uploadLogisticaReversa(
  _prevState: { erro?: string; aviso?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string; aviso?: string }> {
  const session = await requireAuditor();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resultado = await importarArquivoLogisticaReversa(
    buffer,
    file.name,
    file.type || "text/csv",
    session.user.id
  );

  revalidatePath("/logistica-reversa");
  if (resultado.status === "ERRO") return { erro: resultado.mensagem };
  if (resultado.status === "AVISO") return { aviso: resultado.mensagem };
  return {};
}

export async function criarLogisticaReversa(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const lojaId = String(formData.get("lojaId") ?? "");
  const mesReferencia = Number(formData.get("mesReferencia"));
  const anoReferencia = Number(formData.get("anoReferencia"));
  const volumeItensTexto = String(formData.get("volumeItens") ?? "").trim();
  const valorTotal = String(formData.get("valorTotal") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!lojaId || !mesReferencia || !anoReferencia || !valorTotal) {
    return { erro: "Preencha loja, mês, ano e valor total." };
  }

  try {
    await prisma.logisticaReversa.create({
      data: {
        lojaId,
        mesReferencia,
        anoReferencia,
        volumeItens: volumeItensTexto ? Number(volumeItensTexto) : null,
        valorTotal,
        observacao,
        createdByUserId: session.user.id,
      },
    });
  } catch {
    return { erro: "Já existe um registro para essa loja nesse mês/ano." };
  }

  revalidatePath("/logistica-reversa");
  return {};
}
