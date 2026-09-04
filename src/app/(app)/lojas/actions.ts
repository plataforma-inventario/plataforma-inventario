"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
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

export async function atualizarLoja(lojaId: string, formData: FormData) {
  await requireAuditor();

  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const tipoUnidade = String(formData.get("tipoUnidade")) as TipoUnidade;
  const tipoLoja = String(formData.get("tipoLoja")) as TipoLoja;
  const grupoId = String(formData.get("grupoId") ?? "");
  const regiaoId = String(formData.get("regiaoId") ?? "") || null;
  const cicloContagem = parseCiclo(formData.get("cicloContagem"));
  const ativa = formData.get("ativa") === "on";

  await prisma.loja.update({
    where: { id: lojaId },
    data: { nome, cnpj, tipoUnidade, tipoLoja, grupoId, regiaoId, cicloContagem, ativa },
  });

  revalidatePath("/lojas");
  revalidatePath(`/lojas/${lojaId}`);
}

export async function vincularGerente(lojaId: string, formData: FormData) {
  await requireAuditor();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.lojaGerente.upsert({
    where: { lojaId_userId: { lojaId, userId } },
    update: {},
    create: { lojaId, userId },
  });

  revalidatePath(`/lojas/${lojaId}`);
}

export async function desvincularGerente(lojaId: string, userId: string) {
  await requireAuditor();
  await prisma.lojaGerente.delete({
    where: { lojaId_userId: { lojaId, userId } },
  });
  revalidatePath(`/lojas/${lojaId}`);
}
