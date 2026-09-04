-- CreateEnum
CREATE TYPE "PerfilAcesso" AS ENUM ('AUDITOR', 'DIRETORIA', 'GERENTE_VAREJO', 'GERENTE_REVENDA', 'LOGISTICA');

-- CreateEnum
CREATE TYPE "TipoLoja" AS ENUM ('VAREJO', 'REVENDA', 'LOGISTICA');

-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('MATRIZ', 'FILIAL');

-- CreateEnum
CREATE TYPE "CicloContagem" AS ENUM ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL');

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regiao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loja" (
    "id" TEXT NOT NULL,
    "pdv" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "tipoUnidade" "TipoUnidade" NOT NULL,
    "tipoLoja" "TipoLoja" NOT NULL,
    "cicloContagem" "CicloContagem",
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "grupoId" TEXT NOT NULL,
    "regiaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "PerfilAcesso" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LojaGerente" (
    "lojaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LojaGerente_pkey" PRIMARY KEY ("lojaId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nome_key" ON "Grupo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_nome_key" ON "Regiao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_pdv_key" ON "Loja"("pdv");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_cnpj_key" ON "Loja"("cnpj");

-- CreateIndex
CREATE INDEX "Loja_grupoId_idx" ON "Loja"("grupoId");

-- CreateIndex
CREATE INDEX "Loja_regiaoId_idx" ON "Loja"("regiaoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Loja" ADD CONSTRAINT "Loja_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loja" ADD CONSTRAINT "Loja_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LojaGerente" ADD CONSTRAINT "LojaGerente_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LojaGerente" ADD CONSTRAINT "LojaGerente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
