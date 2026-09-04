"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function trocarSenha(
  _prevState: { erro?: string; sucesso?: boolean } | undefined,
  formData: FormData
): Promise<{ erro?: string; sucesso?: boolean }> {
  const session = await auth();
  if (!session) return { erro: "Sessão expirada, faça login novamente." };

  const senhaAtual = String(formData.get("senhaAtual") ?? "");
  const senhaNova = String(formData.get("senhaNova") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (!senhaAtual || !senhaNova || !confirmacao) {
    return { erro: "Preencha todos os campos." };
  }
  if (senhaNova.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (senhaNova !== confirmacao) {
    return { erro: "A confirmação não é igual à nova senha." };
  }

  const usuario = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!senhaValida) {
    return { erro: "Senha atual incorreta." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { senhaHash: await bcrypt.hash(senhaNova, 12) },
  });

  return { sucesso: true };
}
