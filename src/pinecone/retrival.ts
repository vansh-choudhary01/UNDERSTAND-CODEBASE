import type { SymbolType } from "../AST/astBuilder.js";
import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";
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

    return res.matches.map((match) => {
        const chunk: CodeChunk = {
            id: match.id,
            filePath: match.metadata?.filePath as string,
            symbolName: match.metadata?.symbolName as string,
            symbolType: match.metadata?.symbolType as SymbolType,
            parentSymbol: match.metadata?.parentSymbol as string ?? null,
            content: match.metadata?.content as string,
            startLine: Number(match.metadata?.startLine),
            endLine: Number(match.metadata?.endLine),
            startOffset: Number(match.metadata?.startOffset),
            endOffset: Number(match.metadata?.endOffset),
        };
        return {
            chunk,
            score: match.score!
        };
    });
}