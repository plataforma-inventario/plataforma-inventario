-- CreateTable
CREATE TABLE "ImagemAgenda" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagemAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaAgendada" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitaAgendada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagemAgenda_ano_mes_idx" ON "ImagemAgenda"("ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "VisitaAgendada_lojaId_ano_mes_key" ON "VisitaAgendada"("lojaId", "ano", "mes");

-- AddForeignKey
ALTER TABLE "ImagemAgenda" ADD CONSTRAINT "ImagemAgenda_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaAgendada" ADD CONSTRAINT "VisitaAgendada_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaAgendada" ADD CONSTRAINT "VisitaAgendada_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
