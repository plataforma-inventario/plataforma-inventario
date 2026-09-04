-- CreateEnum
CREATE TYPE "StatusParsing" AS ENUM ('PENDENTE', 'OK', 'AVISO', 'ERRO');

-- CreateEnum
CREATE TYPE "DirecaoMovimento" AS ENUM ('ENTRADA', 'SAIDA');

-- AlterTable
ALTER TABLE "ArquivoImportado" ADD COLUMN     "avisosParsing" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "resumoParsing" TEXT,
ADD COLUMN     "statusParsing" "StatusParsing" NOT NULL DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "ItemInventario" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidadeSistema" DECIMAL(14,3) NOT NULL,
    "quantidadeContada" DECIMAL(14,3) NOT NULL,
    "ajuste" DECIMAL(14,3) NOT NULL,
    "custoUnitario" DECIMAL(14,2) NOT NULL,
    "valorAjuste" DECIMAL(14,2) NOT NULL,
    "valorEstoque" DECIMAL(14,2) NOT NULL,
    "lojaOrigemTexto" TEXT NOT NULL,
    "local" TEXT,
    "tipoArquivo" "TipoInventario" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTransferencia" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "direcao" "DirecaoMovimento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "contraparteCodigo" TEXT NOT NULL,
    "contraparteNome" TEXT NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "valorUnitario" DECIMAL(14,2) NOT NULL,
    "valorTotalItem" DECIMAL(14,2) NOT NULL,
    "cfop" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTransferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAjuste" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "direcao" "DirecaoMovimento" NOT NULL,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "custoUnitario" DECIMAL(14,2) NOT NULL,
    "valorTotalCusto" DECIMAL(14,2) NOT NULL,
    "funcionario" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAjuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRequisicao" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "setor" TEXT,
    "solicitante" TEXT,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidadeAtendida" DECIMAL(14,3) NOT NULL,
    "custoTotal" DECIMAL(14,2) NOT NULL,
    "dataRequisicao" TIMESTAMP(3) NOT NULL,
    "motivoCodigo" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemRequisicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faturamento" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "receitaLiquida" DECIMAL(14,2) NOT NULL,
    "periodoTexto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faturamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemInventario_arquivoId_idx" ON "ItemInventario"("arquivoId");

-- CreateIndex
CREATE INDEX "ItemInventario_codigoProduto_idx" ON "ItemInventario"("codigoProduto");

-- CreateIndex
CREATE INDEX "ItemTransferencia_arquivoId_idx" ON "ItemTransferencia"("arquivoId");

-- CreateIndex
CREATE INDEX "ItemTransferencia_codigoProduto_idx" ON "ItemTransferencia"("codigoProduto");

-- CreateIndex
CREATE INDEX "ItemAjuste_arquivoId_idx" ON "ItemAjuste"("arquivoId");

-- CreateIndex
CREATE INDEX "ItemAjuste_codigoProduto_idx" ON "ItemAjuste"("codigoProduto");

-- CreateIndex
CREATE INDEX "ItemRequisicao_arquivoId_idx" ON "ItemRequisicao"("arquivoId");

-- CreateIndex
CREATE INDEX "ItemRequisicao_codigoProduto_idx" ON "ItemRequisicao"("codigoProduto");

-- CreateIndex
CREATE UNIQUE INDEX "Faturamento_arquivoId_key" ON "Faturamento"("arquivoId");

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "ArquivoImportado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransferencia" ADD CONSTRAINT "ItemTransferencia_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "ArquivoImportado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAjuste" ADD CONSTRAINT "ItemAjuste_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "ArquivoImportado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRequisicao" ADD CONSTRAINT "ItemRequisicao_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "ArquivoImportado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faturamento" ADD CONSTRAINT "Faturamento_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "ArquivoImportado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
