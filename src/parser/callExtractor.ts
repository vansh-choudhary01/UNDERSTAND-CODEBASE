import type { SgNode } from "@ast-grep/napi";

export interface CodeCall {
    calledName: string;
    filePath: string;
    parentSymbol: string | null;
    line: number;
}

export function extractCalls(
    root: SgNode,
    filePath: string,
): CodeCall[] {
    const calls: CodeCall[] = [];

    walk(root, calls, filePath, null);

    return calls;
}

function walk(
    node: SgNode,
    calls: CodeCall[],
    filePath: string,
    currentSymbol: string | null,
): void {
    const kind = node.kind();

    let nextSymbol = currentSymbol;

    if (kind === "function_declaration" || kind === "method_definition") {
        const nameNode = node.field("name");

        if (nameNode) {
            nextSymbol = nameNode.text();
        }
    }

    if (kind === "call_expression") {
        const functionNode = node.field("function");

        if (functionNode) {
            const calledName = functionNode.text().split(".").pop()!;

            calls.push({
                calledName,
                filePath,
                parentSymbol: nextSymbol,
                line: node.range().start.line + 1,
            })
        }
    }

    for (const child of node.namedChildren()) {
        walk(child, calls, filePath, nextSymbol);
    }
}
