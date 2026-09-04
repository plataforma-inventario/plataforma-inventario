"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { PerfilAcesso } from "@/generated/prisma/client";

const PERFIS_VALIDOS = Object.values(PerfilAcesso);

export async function criarUsuario(
  _prevState: { erro?: string } | undefined,
  formData: FormData
): Promise<{ erro?: string }> {
  await requireAuditor();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const perfil = String(formData.get("perfil") ?? "");

  if (!nome || !email || !senha || !PERFIS_VALIDOS.includes(perfil as PerfilAcesso)) {
    return { erro: "Preencha nome, e-mail, senha e perfil." };
  }
  if (senha.length < 8) {
    return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  try {
    await prisma.user.create({
      data: {
        nome,
        email,
        senhaHash: await bcrypt.hash(senha, 12),
        perfil: perfil as PerfilAcesso,
      },
    });
  } catch {
    return { erro: "Já existe um usuário com esse e-mail." };
  }

  revalidatePath("/usuarios");
  return {};
}

export async function alternarAtivo(userId: string, ativo: boolean) {
  await requireAuditor();
  await prisma.user.update({ where: { id: userId }, data: { ativo } });
  revalidatePath("/usuarios");
}
