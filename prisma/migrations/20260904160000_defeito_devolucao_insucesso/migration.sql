-- CreateEnum
CREATE TYPE "TipoDevolucao" AS ENUM ('DEFEITO', 'FALTA_MERCADORIA');

-- AlterTable
ALTER TABLE "Defeito" ADD COLUMN     "arquivoDevolucaoId" TEXT,
ADD COLUMN     "fornecedorNome" TEXT,
ADD COLUMN     "tipoDevolucao" "TipoDevolucao";

-- CreateTable
CREATE TABLE "ArquivoDevolucao" (
    "id" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "hashConteudo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "statusParsing" "StatusParsing" NOT NULL DEFAULT 'PENDENTE',
    "resumoParsing" TEXT,
    "avisosParsing" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArquivoDevolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDefeito" (
    "id" TEXT NOT NULL,
    "defeitoId" TEXT NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "valorTotalItem" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ItemDefeito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insucesso" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "numeroNotaFiscal" TEXT,
    "fotoCaixa" BYTEA,
    "fotoCaixaTipoMime" TEXT,
    "observacao" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insucesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArquivoDevolucao_hashConteudo_key" ON "ArquivoDevolucao"("hashConteudo");

-- CreateIndex
CREATE INDEX "ItemDefeito_defeitoId_idx" ON "ItemDefeito"("defeitoId");

-- CreateIndex
CREATE INDEX "Insucesso_lojaId_idx" ON "Insucesso"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "Defeito_lojaId_numeroNotaFiscal_key" ON "Defeito"("lojaId", "numeroNotaFiscal");

-- AddForeignKey
ALTER TABLE "ArquivoDevolucao" ADD CONSTRAINT "ArquivoDevolucao_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defeito" ADD CONSTRAINT "Defeito_arquivoDevolucaoId_fkey" FOREIGN KEY ("arquivoDevolucaoId") REFERENCES "ArquivoDevolucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDefeito" ADD CONSTRAINT "ItemDefeito_defeitoId_fkey" FOREIGN KEY ("defeitoId") REFERENCES "Defeito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insucesso" ADD CONSTRAINT "Insucesso_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insucesso" ADD CONSTRAINT "Insucesso_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
