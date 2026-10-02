import type { SymbolType } from "../AST/astBuilder.js";
import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";
import prisma from "../lib/prisma.js";
import { embed } from "../OpenAi/embeddings.js";
import { index } from "./vector.js";

export async function vectorRetrivalSearch(query: string, topK: number, repo: string): Promise<{chunk: CodeChunk, score: number}[]>  {
    const queryEmbedding = (await embed(query)).embedding;
    const res = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: {
            repository: repo
        }
    });

    const chunks = await prisma.codeChunk.findMany({
        where: {
            id: {
                in: res.matches.map((match) => match.id)
            }
        }
    });

    return res.matches.map((match, i) => {
        const chunk: CodeChunk = {
            id: chunks[i]!.id,
            filePath: chunks[i]?.filePath as string,
            symbolName: chunks[i]?.symbolName as string,
            symbolType: chunks[i]?.symbolType as SymbolType,
            parentSymbol: chunks[i]?.parentSymbol as string ?? null,
            content: chunks[i]?.content as string,
            startLine: Number(chunks[i]?.startLine),
            endLine: Number(chunks[i]?.endLine),
            startOffset: Number(chunks[i]?.startOffset),
            endOffset: Number(chunks[i]?.endOffset),
        };
        return {
            chunk,
            score: match.score!
        };
    });
}