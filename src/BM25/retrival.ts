import { BM25 } from "fast-bm25";
import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";
import prisma from "../lib/prisma.js";

export function search(query: string, topK: number, codeChunks: CodeChunk[]): { chunk: CodeChunk, score: number }[] {
    const docs = codeChunks.map((chunk) => ({
        title: chunk.id,
        content: chunk.content
    }))

    const bm25 = new BM25(docs);
    const results = bm25.search(query, topK);
    return results.map((result) => {
        const chunk = codeChunks[result.index]!;
        return {
            chunk,
            score: result.score,
        };
    });
}

export function BM25RetrivalSearch(query: string, topK: number, repo: string) {
    const repoRes = prisma.repo.findFirst({
        where: {
            repository: repo
        },
        select: {
            chunks: true
        }
    });

    if (repoRes === null) throw new Error("Repo not found");

    return search(query, topK, repoRes.chunks as unknown as CodeChunk[])
}