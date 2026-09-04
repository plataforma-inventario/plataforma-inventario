"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";

export async function uploadImagemAgenda(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  const arquivo = formData.get("arquivo");

  if (!ano || !mes || mes < 1 || mes > 12) {
    return { erro: "Selecione o mês e o ano." };
  }
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione uma imagem." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  await prisma.imagemAgenda.create({
    data: {
      ano,
      mes,
      nomeArquivo: arquivo.name,
      tipoMime: arquivo.type || "image/png",
      conteudo: buffer,
      tamanhoBytes: arquivo.size,
      uploadedByUserId: session.user.id,
    },
  });

  revalidatePath("/calendario/agenda");
  return {};
}

export async function removerImagemAgenda(id: string) {
  await requireAuditor();
  await prisma.imagemAgenda.delete({ where: { id } });
  revalidatePath("/calendario/agenda");
}

export async function salvarVisitaAgendada(
  lojaId: string,
  ano: number,
  mes: number,
  dataTexto: string
) {
  const session = await requireAuditor();

  if (!dataTexto) {
    // campo limpo: remove a visita agendada, se existir
    await prisma.visitaAgendada.deleteMany({ where: { lojaId, ano, mes } });
    revalidatePath("/calendario/agenda");
    revalidatePath("/calendario");
    return;
  }

  await prisma.visitaAgendada.upsert({
    where: { lojaId_ano_mes: { lojaId, ano, mes } },
    create: {
      lojaId,
      ano,
      mes,
      dataAgendada: new Date(`${dataTexto}T00:00:00`),
      createdByUserId: session.user.id,
    },
    update: {
      dataAgendada: new Date(`${dataTexto}T00:00:00`),
    },
  });

  revalidatePath("/calendario/agenda");
  revalidatePath("/calendario");
}
