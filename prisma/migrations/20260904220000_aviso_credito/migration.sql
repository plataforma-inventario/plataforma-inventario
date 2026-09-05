-- AlterTable
ALTER TABLE "Defeito" ADD COLUMN     "avisoCreditoOrigemId" TEXT;

-- CreateTable
CREATE TABLE "ArquivoAvisoCredito" (
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

    CONSTRAINT "ArquivoAvisoCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArquivoAvisoCredito_hashConteudo_key" ON "ArquivoAvisoCredito"("hashConteudo");

-- AddForeignKey
ALTER TABLE "ArquivoAvisoCredito" ADD CONSTRAINT "ArquivoAvisoCredito_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defeito" ADD CONSTRAINT "Defeito_avisoCreditoOrigemId_fkey" FOREIGN KEY ("avisoCreditoOrigemId") REFERENCES "ArquivoAvisoCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
