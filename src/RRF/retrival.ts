import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";

export type SearchResult = {
    chunk: CodeChunk;
    score: number;
}

export function rrf(
    lexicalResults: SearchResult[],
    semanticResults: SearchResult[],
    topK: number
): SearchResult[] {
    const c = 60;

    const scores = new Map<string, SearchResult>();

    const addResults = (results: SearchResult[]) => {
        results.forEach((result, index) => {
            const rank = index + 1;
            const score = 1 / (c + rank);

            const existing = scores.get(result.chunk.id);

            if (existing) {
                existing.score += score;
            } else {
                scores.set(result.chunk.id, {
                    chunk: result.chunk,
                    score,
                });
            }
        });
    };

    addResults(lexicalResults);
    addResults(semanticResults);

    return Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}