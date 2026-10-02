/*
  Warnings:

  - Changed the type of `startLine` on the `CodeChunk` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endLine` on the `CodeChunk` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `startOffset` on the `CodeChunk` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endOffset` on the `CodeChunk` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "CodeChunk" DROP COLUMN "startLine",
ADD COLUMN     "startLine" INTEGER NOT NULL,
DROP COLUMN "endLine",
ADD COLUMN     "endLine" INTEGER NOT NULL,
DROP COLUMN "startOffset",
ADD COLUMN     "startOffset" INTEGER NOT NULL,
DROP COLUMN "endOffset",
ADD COLUMN     "endOffset" INTEGER NOT NULL;
