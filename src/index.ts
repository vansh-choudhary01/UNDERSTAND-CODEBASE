import fs from "fs";
import { extractSymbols, type CodeSymbol } from "./AST/astBuilder.js";
import { buildCodeChunks, type CodeChunk } from "./CodeChunk/chunkBuilder.js";
import { findRepoFolderName, ingestRepo } from "./ingestion/index.js";
import { parse, Lang } from "@ast-grep/napi";
import { BM25Retriever } from "./BM25/retrival.js";
import { EmbeddingEngine, type VectorRecord } from "./embeddings/EmbeddingEngine.js";
import { embed, embedBatch } from "./OpenAi/embeddings.js";
import dotenv from "dotenv";
dotenv.config();

const fileBasedSymbols: Record<string, CodeSymbol[]> = {};

async function main(repo: string) {
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

            fileBasedSymbols[file.path] = symbols;
        } catch (error) {
            console.error(
                `Error parsing ${file.path}:`,
                error,
            );
        }
    }

    // console.log(
    //     JSON.stringify(fileBasedSymbols, null, 2),
    // );

    const repoFolder = findRepoFolderName(repo);
    const codeChunks: CodeChunk[] = buildCodeChunks(fileBasedSymbols, "/repos/" + repoFolder);
    // console.log(codeChunks);

    const BM25Obj = new BM25Retriever(codeChunks);
    const chunks = BM25Obj.search("create a new todo", 10);
    console.log(chunks);

    const EmbeddingObj = new EmbeddingEngine({embed, embedBatch});
    const embeddings = await EmbeddingObj.embedTexts(chunks.map(chunk => chunk.chunk.content));
    console.log(embeddings);
}

main("https://github.com/vansh-choudhary01/todo");