import type { CodeSymbol, SymbolType } from "../AST/astBuilder.js";
import fs from 'fs'

export interface CodeChunk {
    id: string;
    filePath: string;
    symbolName: string;
    symbolType: SymbolType;
    parentSymbol: string | null;
    content: string;
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
}

export function buildCodeChunk(filePath: string, repoFolder: string, symbol: CodeSymbol): CodeChunk {
    const fileContent = fs.readFileSync(process.cwd() + repoFolder + filePath, "utf8");
    const lines = fileContent.split("\n");

    const relatedLine = lines.slice(symbol.startLine - 1, symbol.endLine).join("\n");

    return {
        id: `${filePath}::${symbol.type}::${symbol.name}${symbol.parent ? `::${symbol.parent}`: ``}`,
        filePath,
        symbolName: symbol.name,
        symbolType: symbol.type,
        parentSymbol: symbol.parent ?? null,
        content: relatedLine.trim(),
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        startOffset: symbol.startOffset,
        endOffset: symbol.endOffset,
    }
}

export function buildCodeChunks(
    fileBasedSymbols: Record<string, CodeSymbol[]>,
    repoFolder: string
) {
    const codeChunks: CodeChunk[] = [];

    for (const [filePath, symbols] of Object.entries(fileBasedSymbols)) {
        for (const symbol of symbols) {
            codeChunks.push(buildCodeChunk(filePath, repoFolder, symbol));
        }
    }

    return codeChunks;
}

