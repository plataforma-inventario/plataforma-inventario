"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { CategoriaArquivo, StatusCiclo } from "@/generated/prisma/client";

const TODAS_CATEGORIAS = Object.values(CategoriaArquivo);

export async function uploadArquivo(
  cicloId: string,
  categoria: CategoriaArquivo,
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hashConteudo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.arquivoImportado.findUnique({ where: { hashConteudo } });
  if (duplicado) {
    return {
      erro: `Esse arquivo já foi importado antes (${duplicado.nomeArquivo}). Reenviar o mesmo arquivo geraria dados em dobro.`,
    };
  }

  try {
    await prisma.arquivoImportado.create({
      data: {
        cicloId,
        categoria,
        nomeArquivo: file.name,
        tipoMime: file.type || "application/octet-stream",
        hashConteudo,
        tamanhoBytes: file.size,
        conteudo: buffer,
        uploadedByUserId: session.user.id,
      },
    });
  } catch {
    return { erro: "Já existe um arquivo enviado para esta categoria neste lançamento." };
  }

  revalidatePath(`/ciclos/${cicloId}`);
  return {};
}

export async function removerArquivo(cicloId: string, arquivoId: string) {
  await requireAuditor();
  await prisma.arquivoImportado.delete({ where: { id: arquivoId } });
  revalidatePath(`/ciclos/${cicloId}`);
}

export async function fecharCiclo(cicloId: string) {
  await requireAuditor();

  const arquivos = await prisma.arquivoImportado.findMany({ where: { cicloId } });
  const categoriasEnviadas = new Set(arquivos.map((a) => a.categoria));
  const faltando = TODAS_CATEGORIAS.filter((c) => !categoriasEnviadas.has(c));
  if (faltando.length > 0) {
    throw new Error(`Faltam categorias: ${faltando.join(", ")}`);
  }

  await prisma.ciclo.update({
    where: { id: cicloId },
    data: { status: StatusCiclo.FECHADO },
  });

  revalidatePath(`/ciclos/${cicloId}`);
  revalidatePath("/lojas");
}
