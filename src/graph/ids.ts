export function getSymbolKey(
    filePath: string,
    type: string,
    name: string,
    startLine: number,
    endLine: number,
    parent: string | null | undefined,
): string {
    return `${filePath}::${type}::${name}::${startLine}::${endLine}::${parent ? `::${parent}` : ""}`;
}

export function getGraphFileId(repository: string, filePath: string): string {
    return `${repository}::${filePath}`;
}

export function getGraphSymbolId(
    repository: string,
    filePath: string,
    type: string,
    name: string,
    startLine: number,
    endLine: number,
    parent: string | null | undefined,
): string {
    return `${repository}::${getSymbolKey(filePath, type, name, startLine, endLine, parent)}`;
}
