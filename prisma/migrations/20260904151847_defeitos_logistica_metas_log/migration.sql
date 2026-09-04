-- CreateEnum
CREATE TYPE "StatusReembolso" AS ENUM ('PENDENTE', 'PARCIAL', 'INTEGRAL');

-- AlterTable
ALTER TABLE "Loja" ADD COLUMN     "metaDivergenciaPercentual" DECIMAL(5,2),
ADD COLUMN     "metaDivergenciaValor" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "Defeito" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "numeroNotaFiscal" TEXT NOT NULL,
    "dataEnvio" TIMESTAMP(3) NOT NULL,
    "valorEnviado" DECIMAL(14,2) NOT NULL,
    "descricaoItens" TEXT,
    "statusReembolso" "StatusReembolso" NOT NULL DEFAULT 'PENDENTE',
    "valorReembolsado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataRecebimentoReembolso" TIMESTAMP(3),
    "observacao" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Defeito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticaReversa" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "volumeItens" INTEGER,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "observacao" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticaReversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAlteracao" (
    "id" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAlteracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Defeito_lojaId_idx" ON "Defeito"("lojaId");

-- CreateIndex
CREATE INDEX "LogisticaReversa_lojaId_idx" ON "LogisticaReversa"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticaReversa_lojaId_mesReferencia_anoReferencia_key" ON "LogisticaReversa"("lojaId", "mesReferencia", "anoReferencia");

-- CreateIndex
CREATE INDEX "LogAlteracao_tabela_registroId_idx" ON "LogAlteracao"("tabela", "registroId");

-- AddForeignKey
ALTER TABLE "Defeito" ADD CONSTRAINT "Defeito_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defeito" ADD CONSTRAINT "Defeito_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticaReversa" ADD CONSTRAINT "LogisticaReversa_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticaReversa" ADD CONSTRAINT "LogisticaReversa_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAlteracao" ADD CONSTRAINT "LogAlteracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
