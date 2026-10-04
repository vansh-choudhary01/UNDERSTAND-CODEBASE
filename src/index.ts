import fs from "fs";
import { extractSymbols, type CodeSymbol } from "./AST/astBuilder.js";
import { buildCodeChunks, type CodeChunk } from "./CodeChunk/chunkBuilder.js";
import { findRepoFolderName, ingestRepo } from "./ingestion/index.js";
import { parse, Lang } from "@ast-grep/napi";
// import { BM25Retriever } from "./BM25/retrival.js";
import { EmbeddingEngine, type VectorRecord } from "./embeddings/EmbeddingEngine.js";
import { embed, embedBatch } from "./OpenAi/embeddings.js";
import dotenv from "dotenv";
import { index } from "./pinecone/vector.js";
import { vectorRetrivalSearch } from "./pinecone/retrival.js";
import { rrf } from "./RRF/retrival.js";
import { buildContext, generateAns } from "./OpenAi/generation.js";
import prisma from "./lib/prisma.js";
import type { Prisma } from "./generated/prisma/client.js";
import { BM25RetrivalSearch } from "./BM25/retrival.js";
import { buildFileSymbolGraph, buildImportRelationships, buildCallRelationships } from "./graph/graphBuilder.js";
import { expandWithGraph, graphResultsToSearchResults } from "./graph/graphRetriever.js";
import { extractCalls, type CodeCall } from "./parser/callExtractor.js";
dotenv.config();

export async function indexRepo(repo: string) {
    const fileBasedSymbols: Record<string, CodeSymbol[]> = {};
    const calls: CodeCall[] = [];
    const ingestionArray =
        (await ingestRepo(
            repo,
        )) || [];

    for (const file of ingestionArray) {
        try {
            const lang = Lang[file.language as keyof typeof Lang];

            if (!lang) {
                continue;
            }

            const root = parse(lang, file.content);
            const ast = root.root();

            const symbols: CodeSymbol[] = [];

            extractSymbols(ast, symbols);
            calls.push(...extractCalls(ast, file.path));

            fileBasedSymbols[file.path] = symbols;
        } catch (error) {
            console.error(
                `Error parsing ${file.path}:`,
                error,
            );
        }
    }

    await buildFileSymbolGraph(ingestionArray, fileBasedSymbols, repo);

    await buildImportRelationships(fileBasedSymbols, repo);
    await buildCallRelationships(calls, repo);

    // console.log(
    //     JSON.stringify(fileBasedSymbols, null, 2),
    // );

    const repoFolder = findRepoFolderName(repo);
    const codeChunks: CodeChunk[] = buildCodeChunks(fileBasedSymbols, "/repos/" + repoFolder);
    // console.log(codeChunks);

    const createRepo: Prisma.RepoCreateInput = {
        repository: repo,
        chunks: {
            create: [...codeChunks.map(chunk => ({
                id: chunk.id,
                filePath: chunk.filePath,
                symbolName: chunk.symbolName,
                symbolType: chunk.symbolType,
                parentSymbol: chunk.parentSymbol ?? "",
                content: chunk.content,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                startOffset: chunk.startOffset,
                endOffset: chunk.endOffset,
            }))]
        }
    };

    const EmbeddingObj = new EmbeddingEngine({ embed, embedBatch });
    const embeddings = await EmbeddingObj.embedTexts(codeChunks.map(chunk => chunk.content));
    // console.log(embeddings);

    const records = codeChunks.map((item, i) => {
        const chunk = item;

        return {
            id: chunk.id,
            values: embeddings[i]!.embedding,
            metadata: {
                repository: repo,
            },
        };
    });

    const indexPromises = [];
    if (records.length > 100) {
        for (let i = 0; i < records.length; i += 100) {
            const batch = records.slice(i, i + 100);
            indexPromises.push(index.upsert({ records: batch }));
        }
    } else {
        indexPromises.push(index.upsert({ records: records }));
    }

    await Promise.all([
        prisma.repo.create({
            data: createRepo
        }),
        ...indexPromises
    ])
}

export async function ask(query: string, repo: string) {
    const [semantic, lexical] = await Promise.all([
        vectorRetrivalSearch(query, 20, repo),
        BM25RetrivalSearch(query, 20, repo),
    ]);
    const HybridRetriever = { lexical, semantic };

    const hybridResults = rrf(HybridRetriever.lexical, HybridRetriever.semantic, 10);
    const graphResults = await expandWithGraph(
        hybridResults,
        repo,
    );

    console.log(graphResults);
    // console.log(rrfResults)

    const graphSearchResults =
        await graphResultsToSearchResults(
            graphResults,
            repo
        );
    console.log(graphSearchResults)
    const finalResults = rrf(
        hybridResults,
        graphSearchResults,
        10,
    );
    const context = buildContext(finalResults, 8000);
    const response = await generateAns(query, context);
    // console.log(response);
    const res = JSON.parse(response);
    if ("newQuery" in res) {
        const newQuery = res.newQuery;
        const [semantic, lexical] = await Promise.all([
            vectorRetrivalSearch(newQuery, 20, repo),
            BM25RetrivalSearch(newQuery, 20, repo),
        ]);
        const HybridRetriever = { lexical, semantic };

        const rrfResults = rrf(HybridRetriever.lexical, HybridRetriever.semantic, 10);

        const newContext = buildContext(rrfResults, 8000);
        const response = await generateAns(query, newContext, context);
        // console.log(response);
        return JSON.parse(response);
    }

    return res;
}
