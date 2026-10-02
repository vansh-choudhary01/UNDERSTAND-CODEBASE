-- CreateTable
CREATE TABLE "Repo" (
    "id" SERIAL NOT NULL,
    "repository" TEXT NOT NULL,
    "branch" TEXT NOT NULL,

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeChunk" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "symbolName" TEXT NOT NULL,
    "symbolType" TEXT NOT NULL,
    "parentSymbol" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startLine" TEXT NOT NULL,
    "endLine" TEXT NOT NULL,
    "startOffset" TEXT NOT NULL,
    "endOffset" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,

    CONSTRAINT "CodeChunk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodeChunk" ADD CONSTRAINT "CodeChunk_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
