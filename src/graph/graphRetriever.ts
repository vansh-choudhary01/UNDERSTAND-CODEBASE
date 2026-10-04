import type { SymbolType } from "../AST/astBuilder.js";
import type { CodeChunk } from "../CodeChunk/chunkBuilder.js";
import prisma from "../lib/prisma.js";
import type { SearchResult } from "../RRF/retrival.js";
import {
    getOutgoingCalls,
    getIncomingCalls,
} from "./graphQueries.js";
import { getGraphSymbolId } from "./ids.js";

export interface GraphResult {
    sourceId: string;
    sourceName: string;

    targetId: string;
    targetName: string;

    relationship: string;
}

export class GraphRetriever {

    async getDependencies(
        symbolId: string,
    ): Promise<GraphResult[]> {

        const results = await getOutgoingCalls(symbolId);

        return results;
    }

    async getDependents(
        symbolId: string,
    ): Promise<GraphResult[]> {

        const results = await getIncomingCalls(symbolId);

        return results;
    }
}

export interface GraphSearchResult {
    symbolId: string;
    symbolName: string;
    relationship: string;
    sourceSymbolId: string;
    score: number;
}

export async function expandWithGraph(
    results: SearchResult[],
    repository: string,
): Promise<GraphSearchResult[]> {
    const graphRetriever = new GraphRetriever();

    const graphResults: GraphSearchResult[] = [];

    const seen = new Set<string>();

    const seeds = results.slice(0, 5);

    for (const result of seeds) {
        const symbolId = getGraphSymbolId(
            repository,
            result.chunk.filePath,
            result.chunk.symbolType,
            result.chunk.symbolName,
            result.chunk.startLine,
            result.chunk.endLine,
            result.chunk.parentSymbol,
        );

        const dependencies =
            await graphRetriever.getDependencies(symbolId);

        for (const dependency of dependencies) {

            const key =
                `${dependency.sourceId}->${dependency.targetId}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);

            graphResults.push({
                symbolId: dependency.targetId,
                symbolName: dependency.targetName,
                relationship: dependency.relationship,
                sourceSymbolId: dependency.sourceId,

                score: 1,
            });
        }
    }

    return graphResults;
}

export async function graphResultsToSearchResults(
    graphResults: GraphSearchResult[],
    repo: string,
): Promise<SearchResult[]> {
    const repoRes = await prisma.repo.findFirst({ where: { repository: repo } });

    if (!repoRes) {
        return [];
    }

    const unscopedIds = graphResults.map((result) =>
        result.symbolId.slice(`${repo}::`.length)
    );

    const chunks = await prisma.codeChunk.findMany({
        where: {
            repoId: repoRes.id,
            id: {
                in: unscopedIds,
            }
        }
    })
    const chunkBySymbolId = new Map<string, CodeChunk>();

    for (const chunk of chunks) {
        const symbolId = `${repo}::${chunk.id}`;
        const realChunk: CodeChunk = {
            id: chunk.id,
            filePath: chunk.filePath,
            symbolName: chunk.symbolName,
            symbolType: chunk.symbolType as SymbolType,
            content: chunk.content,
            parentSymbol: chunk.parentSymbol,
            startLine: Number(chunk.startLine),
            endLine: Number(chunk.endLine),
            startOffset: Number(chunk.startOffset),
            endOffset: Number(chunk.endOffset),
        }
        chunkBySymbolId.set(symbolId, realChunk);
    }

    const results: SearchResult[] = [];

    for (const result of graphResults) {
        const chunk = chunkBySymbolId.get(result.symbolId);

        if (!chunk) {
            continue;
        }

        results.push({
            chunk,
            score: result.score,
        });
    }

    return results;
}
