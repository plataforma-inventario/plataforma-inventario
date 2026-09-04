import { auth } from "@/auth";
import { PerfilAcesso } from "@/generated/prisma/client";

/**
 * Garante que o usuário logado é Auditor antes de permitir uma mutação.
 * Item 1 do briefing: Auditor é o único perfil que cadastra/lança dados —
 * checado aqui além de na UI, pois server actions podem ser chamadas
 * diretamente sem passar pela tela.
 */
export async function requireAuditor() {
  const session = await auth();
  if (!session || session.user.perfil !== PerfilAcesso.AUDITOR) {
    throw new Error("Apenas o perfil Auditor pode realizar esta ação.");
  }
  return session;
}

/**
 * Item 10.2: a meta de divergência é definida pela Diretoria, não só pelo
 * Auditor — única exceção no sistema em que Diretoria (normalmente somente
 * leitura) pode escrever.
 */
export async function requireAuditorOuDiretoria() {
  const session = await auth();
  if (
    !session ||
    (session.user.perfil !== PerfilAcesso.AUDITOR && session.user.perfil !== PerfilAcesso.DIRETORIA)
  ) {
    throw new Error("Apenas Auditor ou Diretoria podem realizar esta ação.");
  }
  return session;
}
