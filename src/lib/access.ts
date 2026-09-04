import { prisma } from "@/lib/prisma";
import { PerfilAcesso, TipoLoja } from "@/generated/prisma/client";

/**
 * Lojas visíveis para um usuário, de acordo com o perfil de acesso (item 1
 * do briefing). Auditor e Diretoria veem tudo; Logística vê todas as lojas
 * (precisa de visão ampla para Transferências/Ajustes); gerentes veem
 * apenas as lojas do seu tipo (varejo/revenda) às quais estão vinculados
 * via LojaGerente.
 */
export function lojasVisiveisWhere(user: { id: string; perfil: PerfilAcesso }) {
  switch (user.perfil) {
    case PerfilAcesso.AUDITOR:
    case PerfilAcesso.DIRETORIA:
    case PerfilAcesso.LOGISTICA:
      return {};
    case PerfilAcesso.GERENTE_VAREJO:
      return {
        tipoLoja: TipoLoja.VAREJO,
        gerentes: { some: { userId: user.id } },
      };
    case PerfilAcesso.GERENTE_REVENDA:
      return {
        tipoLoja: TipoLoja.REVENDA,
        gerentes: { some: { userId: user.id } },
      };
  }
}

export async function getLojasVisiveis(user: { id: string; perfil: PerfilAcesso }) {
  return prisma.loja.findMany({
    where: lojasVisiveisWhere(user),
    include: { grupo: true, regiao: true },
    orderBy: [{ regiao: { nome: "asc" } }, { nome: "asc" }],
  });
}
