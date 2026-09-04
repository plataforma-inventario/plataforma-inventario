import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  const insucesso = await prisma.insucesso.findUnique({ where: { id } });
  if (!insucesso || !insucesso.fotoCaixa) {
    return new Response("Não encontrado", { status: 404 });
  }

  return new Response(new Uint8Array(insucesso.fotoCaixa), {
    headers: { "Content-Type": insucesso.fotoCaixaTipoMime || "image/jpeg" },
  });
}
