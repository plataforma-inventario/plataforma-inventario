"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuditor, requireAuditorOuDiretoria } from "@/lib/authz";
import { registrarAlteracoes } from "@/lib/log-alteracao";
import {
  CicloContagem,
  TipoLoja,
  TipoUnidade,
} from "@/generated/prisma/client";

function parseCiclo(value: FormDataEntryValue | null): CicloContagem | null {
  if (value === "MENSAL" || value === "BIMESTRAL" || value === "TRIMESTRAL") return value;
  return null;
}

export async function criarLoja(_prevState: { erro?: string } | undefined, formData: FormData) {
  await requireAuditor();

  const pdv = Number(formData.get("pdv"));
  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const tipoUnidade = String(formData.get("tipoUnidade")) as TipoUnidade;
  const tipoLoja = String(formData.get("tipoLoja")) as TipoLoja;
  const grupoId = String(formData.get("grupoId") ?? "");
  const regiaoId = String(formData.get("regiaoId") ?? "") || null;
  const cicloContagem = parseCiclo(formData.get("cicloContagem"));

  if (!pdv || !nome || !cnpj || !grupoId) {
    return { erro: "Preencha PDV, nome, CNPJ e grupo." };
  }

  try {
    const loja = await prisma.loja.create({
      data: { pdv, nome, cnpj, tipoUnidade, tipoLoja, grupoId, regiaoId, cicloContagem },
    });
    revalidatePath("/lojas");
    redirect(`/lojas/${loja.id}`);
  } catch {
    return { erro: "Não foi possível criar a loja — confira se o PDV e o CNPJ já não existem." };
  }
}

export async function atualizarLoja(
  lojaId: string,
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  const session = await requireAuditor();

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) {
    return { erro: "Informe o motivo da alteração." };
  }

  const depois = {
    nome: String(formData.get("nome") ?? "").trim(),
    cnpj: String(formData.get("cnpj") ?? "").trim(),
    tipoUnidade: String(formData.get("tipoUnidade")) as TipoUnidade,
    tipoLoja: String(formData.get("tipoLoja")) as TipoLoja,
    grupoId: String(formData.get("grupoId") ?? ""),
    regiaoId: String(formData.get("regiaoId") ?? "") || null,
    cicloContagem: parseCiclo(formData.get("cicloContagem")),
    ativa: formData.get("ativa") === "on",
  };

  await prisma.$transaction(async (tx) => {
    const antes = await tx.loja.findUniqueOrThrow({ where: { id: lojaId } });

    await tx.loja.update({ where: { id: lojaId }, data: depois });

    await registrarAlteracoes(tx, {
      tabela: "Loja",
      registroId: lojaId,
      usuarioId: session.user.id,
      motivo,
      antes,
      depois,
    });
  });

  revalidatePath("/lojas");
  revalidatePath(`/lojas/${lojaId}`);
  return {};
}

export async function atualizarMetaDivergencia(lojaId: string, formData: FormData) {
  const session = await requireAuditorOuDiretoria();

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || "Meta de divergência atualizada";

  const depois = {
    metaDivergenciaPercentual: campo("metaDivergenciaPercentual"),
    metaDivergenciaValor: campo("metaDivergenciaValor"),
    metaSacolaPercentual: campo("metaSacolaPercentual"),
    metaSacolaValor: campo("metaSacolaValor"),
    metaRestoPercentual: campo("metaRestoPercentual"),
    metaRestoValor: campo("metaRestoValor"),
  };

  await prisma.$transaction(async (tx) => {
    const antes = await tx.loja.findUniqueOrThrow({ where: { id: lojaId } });

    await tx.loja.update({
      where: { id: lojaId },
      data: depois,
    });

    await registrarAlteracoes(tx, {
      tabela: "Loja",
      registroId: lojaId,
      usuarioId: session.user.id,
      motivo,
      antes: {
        metaDivergenciaPercentual: antes.metaDivergenciaPercentual,
        metaDivergenciaValor: antes.metaDivergenciaValor,
        metaSacolaPercentual: antes.metaSacolaPercentual,
        metaSacolaValor: antes.metaSacolaValor,
        metaRestoPercentual: antes.metaRestoPercentual,
        metaRestoValor: antes.metaRestoValor,
      },
      depois,
    });
  });

  revalidatePath(`/lojas/${lojaId}`);
  revalidatePath("/ranking");
}

export async function vincularGerente(lojaId: string, formData: FormData) {
  const session = await requireAuditor();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.$transaction(async (tx) => {
    await tx.lojaGerente.upsert({
      where: { lojaId_userId: { lojaId, userId } },
      update: {},
      create: { lojaId, userId },
    });
    await tx.logAlteracao.create({
      data: {
        tabela: "LojaGerente",
        registroId: lojaId,
        campo: "gerente",
        valorAnterior: null,
        valorNovo: userId,
        motivo: "Gerente vinculado à loja",
        usuarioId: session.user.id,
      },
    });
  });

  revalidatePath(`/lojas/${lojaId}`);
}

export async function desvincularGerente(lojaId: string, userId: string) {
  const session = await requireAuditor();

  await prisma.$transaction(async (tx) => {
    await tx.lojaGerente.delete({ where: { lojaId_userId: { lojaId, userId } } });
    await tx.logAlteracao.create({
      data: {
        tabela: "LojaGerente",
        registroId: lojaId,
        campo: "gerente",
        valorAnterior: userId,
        valorNovo: null,
        motivo: "Gerente desvinculado da loja",
        usuarioId: session.user.id,
      },
    });
  });

  revalidatePath(`/lojas/${lojaId}`);
}
