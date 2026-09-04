import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseLogisticaReversa } from "./logistica-reversa";
import { StatusParsing } from "@/generated/prisma/client";

export type ResultadoImportacaoLogisticaReversa = {
  status: "OK" | "AVISO" | "ERRO";
  mensagem: string;
};

// Fórmula combinada com o usuário (2026-09-04): valor da nota em R$ ->
// kg (dividindo pelo preço médio por kg do material) -> caixas (assumindo
// ~5kg por caixa). Aplicada sobre o valor total de cada NF.
const PRECO_MEDIO_POR_KG = 0.336;
const KG_POR_CAIXA = 5;

export async function importarArquivoLogisticaReversa(
  buffer: Buffer<ArrayBuffer>,
  nomeArquivo: string,
  tipoMime: string,
  uploadedByUserId: string
): Promise<ResultadoImportacaoLogisticaReversa> {
  const hashConteudo = createHash("sha256").update(buffer).digest("hex");

  const duplicado = await prisma.arquivoLogisticaReversa.findUnique({ where: { hashConteudo } });
  if (duplicado) {
    return { status: "ERRO", mensagem: `Esse arquivo já foi importado antes (${duplicado.nomeArquivo}).` };
  }

  const resultado = parseLogisticaReversa(buffer);
  const avisos = [...resultado.avisos];

  if (resultado.linhas.length === 0) {
    await prisma.arquivoLogisticaReversa.create({
      data: {
        nomeArquivo, tipoMime, hashConteudo, tamanhoBytes: buffer.length, conteudo: buffer,
        uploadedByUserId, statusParsing: StatusParsing.ERRO, resumoParsing: "Nenhuma nota reconhecida.",
        avisosParsing: avisos,
      },
    });
    return { status: "ERRO", mensagem: "Nenhuma nota reconhecida no arquivo." };
  }

  // agrupa por (pdv, mes, ano) - varias NFs de meses diferentes podem
  // aparecer no mesmo arquivo (ex: reenvio ou virada de mes).
  const porLojaMes = new Map<string, { pdv: number; mes: number; ano: number; valorTotal: number }>();
  for (const nota of resultado.linhas) {
    const mes = nota.dataEmissao.getMonth() + 1;
    const ano = nota.dataEmissao.getFullYear();
    const chave = `${nota.lojaPdv}::${mes}::${ano}`;
    const atual = porLojaMes.get(chave) ?? { pdv: nota.lojaPdv, mes, ano, valorTotal: 0 };
    atual.valorTotal += Number(nota.valorTotalNota);
    porLojaMes.set(chave, atual);
  }

  // busca todas as lojas envolvidas de uma vez só, fora da transação, pra
  // não estourar o tempo limite fazendo uma consulta por loja (o arquivo
  // mensal cobre muitas lojas de uma vez - visto na prática com ~20 lojas
  // batendo no timeout padrão de 5s).
  const pdvsEnvolvidos = [...new Set([...porLojaMes.values()].map((v) => v.pdv))];
  const lojasEncontradas = await prisma.loja.findMany({ where: { pdv: { in: pdvsEnvolvidos } } });
  const lojaPorPdv = new Map(lojasEncontradas.map((l) => [l.pdv, l]));

  let lojasNaoEncontradas = 0;
  for (const pdv of pdvsEnvolvidos) {
    if (!lojaPorPdv.has(pdv)) {
      avisos.push(`PDV ${pdv}: loja não encontrada no cadastro, ignorada.`);
      lojasNaoEncontradas++;
    }
  }

  await prisma.$transaction(
    async (tx) => {
      const arquivo = await tx.arquivoLogisticaReversa.create({
        data: {
          nomeArquivo, tipoMime, hashConteudo, tamanhoBytes: buffer.length, conteudo: buffer,
          uploadedByUserId, statusParsing: StatusParsing.PENDENTE,
        },
      });

      for (const { pdv, mes, ano, valorTotal } of porLojaMes.values()) {
        const loja = lojaPorPdv.get(pdv);
        if (!loja) continue;
        const caixas = Math.round(valorTotal / PRECO_MEDIO_POR_KG / KG_POR_CAIXA);
        await tx.logisticaReversa.upsert({
          where: { lojaId_mesReferencia_anoReferencia: { lojaId: loja.id, mesReferencia: mes, anoReferencia: ano } },
          create: {
            lojaId: loja.id, mesReferencia: mes, anoReferencia: ano, volumeItens: caixas,
            valorTotal, arquivoOrigemId: arquivo.id, createdByUserId: uploadedByUserId,
          },
          update: { volumeItens: caixas, valorTotal, arquivoOrigemId: arquivo.id },
        });
      }

      const status = lojasNaoEncontradas > 0 ? StatusParsing.AVISO : StatusParsing.OK;
      const resumo = `${porLojaMes.size} loja(s)/mês, ${resultado.linhas.length} nota(s), ${avisos.length} aviso(s)`;
      await tx.arquivoLogisticaReversa.update({
        where: { id: arquivo.id },
        data: { statusParsing: status, resumoParsing: resumo, avisosParsing: avisos },
      });
    },
    { timeout: 20000 }
  );

  return {
    status: avisos.length > 0 ? "AVISO" : "OK",
    mensagem: `${porLojaMes.size} loja(s)/mês, ${resultado.linhas.length} nota(s) processadas${avisos.length > 0 ? `, ${avisos.length} aviso(s)` : ""}.`,
  };
}
