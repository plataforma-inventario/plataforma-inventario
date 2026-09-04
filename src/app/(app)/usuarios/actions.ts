"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { registrarAlteracoes } from "@/lib/log-alteracao";
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
  const session = await requireAuditor();

  await prisma.$transaction(async (tx) => {
    const antes = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.user.update({ where: { id: userId }, data: { ativo } });
    await registrarAlteracoes(tx, {
      tabela: "User",
      registroId: userId,
      usuarioId: session.user.id,
      motivo: ativo ? "Usuário reativado" : "Usuário inativado",
      antes: { ativo: antes.ativo },
      depois: { ativo },
    });
  });

  revalidatePath("/usuarios");
}
