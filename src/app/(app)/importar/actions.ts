"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuditor } from "@/lib/authz";
import { detectarTipoArquivo } from "@/lib/parsers/detectar";
import { extrairLojaPdv } from "@/lib/parsers/extrair-loja";
import { processarEArmazenar } from "@/lib/parsers/processar";
import { importarArquivoDevolucao } from "@/lib/parsers/processar-devolucao";
import { CategoriaArquivo, StatusParsing } from "@/generated/prisma/client";

export type ResultadoImportacao = {
  nomeArquivo: string;
  status: "OK" | "AVISO" | "ERRO";
  mensagem: string;
};

const ROTULO_CATEGORIA: Record<string, string> = {
  INVENTARIO: "Inventário",
  TRANSFERENCIA_ENTRADA: "Transferência entrada",
  TRANSFERENCIA_SAIDA: "Transferência saída",
  AJUSTE: "Ajuste",
  REQUISICAO: "Requisição",
  FATURAMENTO: "Faturamento",
  DEVOLUCAO: "Devolução (Defeitos)",
};

export async function importarArquivos(
  _prevState: { resultados?: ResultadoImportacao[]; erro?: string } | undefined,
  formData: FormData
): Promise<{ resultados?: ResultadoImportacao[]; erro?: string }> {
  const session = await requireAuditor();

  const arquivos = formData
    .getAll("arquivos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length === 0) {
    return { erro: "Selecione ao menos um arquivo." };
  }

  const resultados: ResultadoImportacao[] = [];

  for (const file of arquivos) {
    const nomeArquivo = file.name;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const deteccao = detectarTipoArquivo(buffer, nomeArquivo);

      if (deteccao.tipo === "DESCONHECIDO") {
        resultados.push({ nomeArquivo, status: "ERRO", mensagem: deteccao.motivo });
        continue;
      }

      if (deteccao.tipo === "DEVOLUCAO") {
        const r = await importarArquivoDevolucao(
          buffer,
          nomeArquivo,
          file.type || "text/csv",
          session.user.id
        );
        resultados.push({ nomeArquivo, status: r.status, mensagem: `Devolução — ${r.mensagem}` });
        continue;
      }

      const categoria = deteccao.tipo as CategoriaArquivo;
      const rotulo = ROTULO_CATEGORIA[categoria];
      const pdv = await extrairLojaPdv(categoria, buffer);

      if (!pdv) {
        resultados.push({
          nomeArquivo,
          status: "ERRO",
          mensagem: `${rotulo}: não identifiquei a loja automaticamente neste arquivo — envie pela tela do lançamento da loja correta.`,
        });
        continue;
      }

      const loja = await prisma.loja.findUnique({ where: { pdv } });
      if (!loja) {
        resultados.push({
          nomeArquivo,
          status: "ERRO",
          mensagem: `${rotulo}: loja com PDV ${pdv} não encontrada no cadastro.`,
        });
        continue;
      }

      const ciclo = await prisma.ciclo.findFirst({ where: { lojaId: loja.id, status: "ABERTO" } });
      if (!ciclo) {
        resultados.push({
          nomeArquivo,
          status: "ERRO",
          mensagem: `${rotulo}: loja ${pdv} (${loja.nome}) não tem lançamento em aberto — crie um em "+ Novo lançamento" primeiro.`,
        });
        continue;
      }

      const jaTemCategoria = await prisma.arquivoImportado.findUnique({
        where: { cicloId_categoria: { cicloId: ciclo.id, categoria } },
      });
      if (jaTemCategoria) {
        resultados.push({
          nomeArquivo,
          status: "ERRO",
          mensagem: `${rotulo}: o lançamento aberto da loja ${pdv} já tem um arquivo dessa categoria.`,
        });
        continue;
      }

      const hashConteudo = createHash("sha256").update(buffer).digest("hex");
      const duplicado = await prisma.arquivoImportado.findUnique({ where: { hashConteudo } });
      if (duplicado) {
        resultados.push({
          nomeArquivo,
          status: "ERRO",
          mensagem: `${rotulo}: esse arquivo já foi importado antes (${duplicado.nomeArquivo}).`,
        });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const arquivo = await tx.arquivoImportado.create({
          data: {
            cicloId: ciclo.id,
            categoria,
            nomeArquivo,
            tipoMime: file.type || "application/octet-stream",
            hashConteudo,
            tamanhoBytes: file.size,
            conteudo: buffer,
            uploadedByUserId: session.user.id,
          },
        });

        const { status, resumo, avisos } = await processarEArmazenar(tx, arquivo.id, categoria, buffer);
        await tx.arquivoImportado.update({
          where: { id: arquivo.id },
          data: { statusParsing: status, resumoParsing: resumo, avisosParsing: avisos },
        });

        resultados.push({
          nomeArquivo,
          status: status === StatusParsing.ERRO ? "ERRO" : status === StatusParsing.AVISO ? "AVISO" : "OK",
          mensagem: `${rotulo} — loja ${pdv} (${loja.nome}) — ${resumo}`,
        });
      });
    } catch (e) {
      resultados.push({
        nomeArquivo,
        status: "ERRO",
        mensagem: e instanceof Error ? e.message : "Erro inesperado ao processar o arquivo.",
      });
    }
  }

  revalidatePath("/lojas");
  revalidatePath("/defeitos");
  revalidatePath("/ciclos", "layout");

  return { resultados };
}
