import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Item 10.5: toda edição em dado já lançado fica registrada — quem alterou,
 * quando, e o motivo. Grava uma linha por campo que realmente mudou;
 * campos iguais são ignorados (evita ruído no histórico).
 */
export async function registrarAlteracoes(
  tx: Tx,
  params: {
    tabela: string;
    registroId: string;
    usuarioId: string;
    motivo: string;
    antes: Record<string, unknown>;
    depois: Record<string, unknown>;
  }
) {
  const { tabela, registroId, usuarioId, motivo, antes, depois } = params;

  const linhas = Object.keys(depois)
    .filter((campo) => String(antes[campo] ?? "") !== String(depois[campo] ?? ""))
    .map((campo) => ({
      tabela,
      registroId,
      campo,
      valorAnterior: antes[campo] == null ? null : String(antes[campo]),
      valorNovo: depois[campo] == null ? null : String(depois[campo]),
      motivo,
      usuarioId,
    }));

  if (linhas.length > 0) {
    await tx.logAlteracao.createMany({ data: linhas });
  }

  return linhas.length;
}
