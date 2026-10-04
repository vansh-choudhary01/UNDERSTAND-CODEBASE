import type { CodeSymbol } from "../AST/astBuilder.js";
import type { FilePath } from "../ingestion/types.js";
import type { CodeCall } from "../parser/callExtractor.js";
import { neo4jDriver, NEO4J_DATABASE } from "./neo4j.js";
import { getGraphFileId, getGraphSymbolId } from "./ids.js";

export async function buildImportRelationships(
    fileBasedSymbols: Record<string, CodeSymbol[]>,
    repository: string,
): Promise<void> {
    const filePaths = new Set(
        Object.keys(fileBasedSymbols)
    );

    const imports: {sourceFile: string; importedPath: string; }[]= [];
    
    for (let [key, value] of Object.entries(fileBasedSymbols)) {
        imports.push(...value
        .filter((symbol) => symbol.type === "import")
        .map((symbol) => ({
            sourceFile: key,
            importedPath: symbol.name
        })));
    }

    const relationships = imports
        .map((item) => {
            const targetFile = resolveImportPath(
                item.sourceFile,
                item.importedPath,
                filePaths
            );

            if (!targetFile) {
                return null;
            }

            return {
                sourceFile: getGraphFileId(repository, item.sourceFile),
                targetFile: getGraphFileId(repository, targetFile),
            }
        })
        .filter(
            (
                relationship,
            ): relationship is {
                sourceFile: string;
                targetFile: string;
            } => relationship !== null
        );

    await neo4jDriver.executeQuery(
        `
        UNWIND $relationships AS relationship

        MATCH (source:File {
            id: relationship.sourceFile
        })

        MATCH (target:File {
            id: relationship.targetFile
        })

        MERGE (source)-[:IMPORTS]->(target)
        `,
        {
            relationships
        },
        {
            database: NEO4J_DATABASE
        }
    );

    console.log(`Created ${relationships.length} IMPORTS relationships`);
}

function resolveImportPath(
    sourceFile: string,
    importedPath: string,
    filePaths: Set<string>
): string | null {
    if (!importedPath.startsWith(".")) {
        return null;
    }

    const lastSlash = sourceFile.lastIndexOf("/");

    const directory = lastSlash === -1 ? "" : sourceFile.slice(0, lastSlash);

    const candidate = normalizePath(
        `${directory}/${importedPath}`
    );

    const extensions = [
        "",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
    ];

    for (const extension of extensions) {
        const possiblePath = `${candidate}${extension}`;

        if (filePaths.has(possiblePath)) {
            return possiblePath;
        }

        const indexPath = `${candidate}/index${extension}`;

        if (filePaths.has(indexPath)) {
            return indexPath;
        }

    }
    return null;
}

function normalizePath(path: string): string {
    const parts = path.split("/");
    const result: string[] = [];

    for (const part of parts) {
        if (!part || part === ".") {
            continue;
        }

        if (part === "..") {
            result.pop();
            continue;
        }

        result.push(part);
    }

    return "/" + result.join("/");
}

export async function buildFileSymbolGraph(
    files: FilePath[],
    fileBasedSymbols: Record<string, CodeSymbol[]>,
    repository: string,
): Promise<void> {
    const fileRecords = files.map((file) => ({
        id: getGraphFileId(repository, file.path),
        filePath: file.path,
        language: file.language,
        repository,
    }));

    const symbolRecords = Object.entries(fileBasedSymbols).flatMap(([filePath, symbols]) =>
        symbols.map((symbol) => ({
            id: getGraphSymbolId(
                repository,
                filePath,
                symbol.type,
                symbol.name,
                symbol.startLine,
                symbol.endLine,
                symbol.parent,
            ),
            name: symbol.name,
            type: symbol.type,
            filePath: filePath,
            fileId: getGraphFileId(repository, filePath),
            repository,
            startLine: symbol.startLine,
            endLine: symbol.endLine,
            startOffset: symbol.startOffset,
            endOffset: symbol.endOffset,
        }))
    );

    await neo4jDriver.executeQuery(
        `
        UNWIND $files AS file
        MERGE (f:File {
            id: file.id
        })

        SET
            f.filePath = file.filePath,
            f.language = file.language,
            f.repository = file.repository
        `,
        {
            files: fileRecords,
        },
        { database: NEO4J_DATABASE }
    );

    await neo4jDriver.executeQuery(
        `
            UNWIND $symbols AS symbol

            MERGE (s:Symbol {
                id: symbol.id
            })

            SET
                s.name = symbol.name,
                s.type = symbol.type,
                s.filePath = symbol.filePath,
                s.repository = symbol.repository,
                s.startLine = symbol.startLine,
                s.endLine = symbol.endLine

            WITH s, symbol

            MATCH (f:File {
                id: symbol.fileId
            })

            MERGE (f)-[:DEFINES]->(s)
        `,
        {
            symbols: symbolRecords
        },
        {
            database: NEO4J_DATABASE
        }
    );

    console.log(`Graph built: ${files.length} files and ${symbolRecords.length} symbols`);
}

export async function buildCallRelationships(
    calls: CodeCall[],
    repository: string,
): Promise<void> {
    const relationships = calls.map((call) => ({
        repository,
        filePath: call.filePath,
        callerName: call.parentSymbol,
        calledName: call.calledName,
        line: call.line
    }));

    await neo4jDriver.executeQuery(
        `
        UNWIND $relationships AS relationship

        MATCH (caller:Symbol {
            repository: relationship.repository,
            filePath: relationship.filePath,
            name: relationship.callerName
        })

        MATCH (callee:Symbol {
            repository: relationship.repository,
            name: relationship.calledName
        })

        WHERE callee.filePath = caller.filePath
           OR EXISTS {
                MATCH (source:File {
                    repository: relationship.repository,
                    filePath: caller.filePath
                })-[:IMPORTS]->(target:File {
                    repository: relationship.repository,
                    filePath: callee.filePath
                })
           }

        MERGE (caller)-[
            r:CALLS
        ]->(callee)

        SET r.line = relationship.line
        `,
        {
            relationships,
        },
        {
            database: NEO4J_DATABASE,
        }
    );

    console.log(`Created ${relationships.length} CALLS relationships`)
}
