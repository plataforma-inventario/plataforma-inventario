/*
  Warnings:

  - You are about to drop the column `storageKey` on the `ArquivoImportado` table. All the data in the column will be lost.
  - Added the required column `conteudo` to the `ArquivoImportado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipoMime` to the `ArquivoImportado` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArquivoImportado" DROP COLUMN "storageKey",
ADD COLUMN     "conteudo" BYTEA NOT NULL,
ADD COLUMN     "tipoMime" TEXT NOT NULL;
