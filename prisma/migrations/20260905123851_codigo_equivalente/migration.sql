-- CreateTable
CREATE TABLE "GrupoCodigoEquivalente" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "observacao" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoCodigoEquivalente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoEquivalente" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "descricaoProduto" TEXT,

    CONSTRAINT "CodigoEquivalente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoEquivalente_codigoProduto_key" ON "CodigoEquivalente"("codigoProduto");

-- CreateIndex
CREATE INDEX "CodigoEquivalente_grupoId_idx" ON "CodigoEquivalente"("grupoId");

-- AddForeignKey
ALTER TABLE "GrupoCodigoEquivalente" ADD CONSTRAINT "GrupoCodigoEquivalente_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoEquivalente" ADD CONSTRAINT "CodigoEquivalente_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoCodigoEquivalente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
