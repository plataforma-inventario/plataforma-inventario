-- AlterTable
ALTER TABLE "LogisticaReversa" ADD COLUMN     "arquivoOrigemId" TEXT;

-- CreateTable
CREATE TABLE "ArquivoLogisticaReversa" (
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

    CONSTRAINT "ArquivoLogisticaReversa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArquivoLogisticaReversa_hashConteudo_key" ON "ArquivoLogisticaReversa"("hashConteudo");

-- AddForeignKey
ALTER TABLE "ArquivoLogisticaReversa" ADD CONSTRAINT "ArquivoLogisticaReversa_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticaReversa" ADD CONSTRAINT "LogisticaReversa_arquivoOrigemId_fkey" FOREIGN KEY ("arquivoOrigemId") REFERENCES "ArquivoLogisticaReversa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
