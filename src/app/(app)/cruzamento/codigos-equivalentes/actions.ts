"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";

function separarCodigos(bruto: string): string[] {
  const codigos = bruto
    .split(/[\n,]+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  // remove duplicados mantendo a ordem
  return [...new Set(codigos)];
}

export async function criarGrupoCodigoEquivalente(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const descricao = String(formData.get("descricao") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  const codigos = separarCodigos(String(formData.get("codigos") ?? ""));

  if (!descricao) {
    return { erro: "Informe uma descrição pro grupo (ex: nome do produto)." };
  }
  if (codigos.length < 2) {
    return { erro: "Informe pelo menos 2 códigos de produto diferentes, separados por vírgula." };
  }

  // Verifica antes de tentar inserir, pra dar uma mensagem amigável em vez de
  // deixar o erro de constraint única do banco vazar pra tela.
  const jaCadastrados = await prisma.codigoEquivalente.findMany({
    where: { codigoProduto: { in: codigos } },
    include: { grupo: { select: { descricao: true } } },
  });
  if (jaCadastrados.length > 0) {
    const lista = jaCadastrados
      .map((c) => `${c.codigoProduto} (já está no grupo "${c.grupo.descricao}")`)
      .join(", ");
    return { erro: `Código(s) já cadastrado(s) em outro grupo: ${lista}.` };
  }

  // Descrição do produto por código: busca o lançamento mais recente que já
  // usou esse código, só como informativo (fica editável depois se precisar).
  const descricoesPorCodigo = await Promise.all(
    codigos.map(async (codigo) => {
      const item = await prisma.itemInventario.findFirst({
        where: { codigoProduto: codigo },
        orderBy: { createdAt: "desc" },
        select: { descricaoProduto: true },
      });
      return { codigo, descricaoProduto: item?.descricaoProduto ?? null };
    })
  );

  try {
    await prisma.grupoCodigoEquivalente.create({
      data: {
        descricao,
        observacao,
        createdByUserId: session.user.id,
        codigos: {
          create: descricoesPorCodigo.map((d) => ({
            codigoProduto: d.codigo,
            descricaoProduto: d.descricaoProduto,
          })),
        },
      },
    });
  } catch {
    return {
      erro: "Não foi possível cadastrar o grupo — confira se nenhum dos códigos já está em outro grupo.",
    };
  }

  revalidatePath("/cruzamento/codigos-equivalentes");
  revalidatePath("/cruzamento");
  return {};
}

export async function removerGrupoCodigoEquivalente(grupoId: string) {
  await requireAuditor();

  await prisma.grupoCodigoEquivalente.delete({ where: { id: grupoId } });

  revalidatePath("/cruzamento/codigos-equivalentes");
  revalidatePath("/cruzamento");
}
