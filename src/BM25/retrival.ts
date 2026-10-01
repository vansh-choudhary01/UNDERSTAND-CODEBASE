import { BM25 } from "fast-bm25";
import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";

export class BM25Retriever {
    private bm25: BM25;
    private codeChunks: CodeChunk[];

    constructor(codeChunks: CodeChunk[]) {
        this.codeChunks = codeChunks;
        const docs = codeChunks.map((chunk) => ({
            title: chunk.id,
            content: chunk.content,
        }));
        this.bm25 = new BM25(docs);
    }

    search(query: string, topK: number): {chunk: CodeChunk, score: number}[] {
        const results = this.bm25.search(query, topK);
        return results.map((result) => {
            const chunk = this.codeChunks[result.index]!;
            return {
                chunk,
                score: result.score,
            };
        });
    }
}