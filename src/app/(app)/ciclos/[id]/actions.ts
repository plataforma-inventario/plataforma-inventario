"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { CategoriaArquivo, StatusCiclo, StatusParsing } from "@/generated/prisma/client";
import { processarEArmazenar } from "@/lib/parsers/processar";
import { registrarAlteracoes } from "@/lib/log-alteracao";

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
    await prisma.$transaction(async (tx) => {
      const arquivo = await tx.arquivoImportado.create({
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

      const { status, resumo, avisos } = await processarEArmazenar(tx, arquivo.id, categoria, buffer);

      await tx.arquivoImportado.update({
        where: { id: arquivo.id },
        data: { statusParsing: status, resumoParsing: resumo, avisosParsing: avisos },
      });
    });
  } catch {
    return { erro: "Já existe um arquivo enviado para esta categoria neste lançamento." };
  }

  revalidatePath(`/ciclos/${cicloId}`);
  return {};
}

export async function removerArquivo(cicloId: string, arquivoId: string) {
  const session = await requireAuditor();

  await prisma.$transaction(async (tx) => {
    const arquivo = await tx.arquivoImportado.findUniqueOrThrow({ where: { id: arquivoId } });
    await tx.arquivoImportado.delete({ where: { id: arquivoId } });
    await registrarAlteracoes(tx, {
      tabela: "ArquivoImportado",
      registroId: cicloId,
      usuarioId: session.user.id,
      motivo: "Arquivo removido do lançamento",
      antes: { categoria: arquivo.categoria, nomeArquivo: arquivo.nomeArquivo },
      depois: { categoria: null, nomeArquivo: null },
    });
  });

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

  const comErro = arquivos.filter((a) => a.statusParsing === StatusParsing.ERRO);
  if (comErro.length > 0) {
    throw new Error(
      `Arquivo(s) com erro de leitura precisam ser reenviados antes de fechar: ${comErro
        .map((a) => a.nomeArquivo)
        .join(", ")}`
    );
  }

  await prisma.ciclo.update({
    where: { id: cicloId },
    data: { status: StatusCiclo.FECHADO },
  });

  revalidatePath(`/ciclos/${cicloId}`);
  revalidatePath("/lojas");
}
