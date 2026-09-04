-- CreateEnum
CREATE TYPE "TipoInventario" AS ENUM ('CICLICO', 'COMPLETO');

-- CreateEnum
CREATE TYPE "MotivoInventarioCompleto" AS ENUM ('SUSPEITA_ROUBO', 'POS_NATAL_JANEIRO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusCiclo" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "CategoriaArquivo" AS ENUM ('INVENTARIO', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE', 'REQUISICAO', 'FATURAMENTO');

-- CreateTable
CREATE TABLE "Ciclo" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "tipoInventario" "TipoInventario" NOT NULL,
    "motivoCompleto" "MotivoInventarioCompleto",
    "motivoDetalhe" TEXT,
    "observacao" TEXT,
    "status" "StatusCiclo" NOT NULL DEFAULT 'ABERTO',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ciclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArquivoImportado" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "categoria" "CategoriaArquivo" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "hashConteudo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArquivoImportado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ciclo_lojaId_idx" ON "Ciclo"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "ArquivoImportado_cicloId_categoria_key" ON "ArquivoImportado"("cicloId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "ArquivoImportado_hashConteudo_key" ON "ArquivoImportado"("hashConteudo");

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoImportado" ADD CONSTRAINT "ArquivoImportado_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoImportado" ADD CONSTRAINT "ArquivoImportado_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
