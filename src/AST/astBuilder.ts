export type SymbolType =
    | "import"
    | "function"
    | "class"
    | "method"
    | "interface"
    | "type_alias"
    | "variable";

export interface CodeSymbol {
    name: string;
    type: SymbolType;
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
    parent?: string;
}

export function createSymbol(
    node: any,
    type: SymbolType,
    name: string,
    parent?: string,
): CodeSymbol {
    const range = node.range();

    return {
        name,
        type,
        startLine: range.start.line + 1,
        endLine: range.end.line + 1,
        startOffset: range.start.index,
        endOffset: range.end.index,
        ...(parent ? { parent } : {}),
    };
}

export function getNodeName(node: any): string | undefined {
    try {
        const namedChildren = node.namedChildren();

        for (const child of namedChildren) {
            if (child.kind() === "identifier") {
                return child.text();
            }
        }

        return undefined;
    } catch {
        return undefined;
    }
}

export function extractSymbols(node: any, symbols: CodeSymbol[], parent?: string) {
    try {
        const kind = node.kind();

        switch (kind) {
            case "import_statement": {
                const sourceNode = node
                    .namedChildren()
                    .find((child: any) => child.kind() === "string");

                const source = sourceNode?.text()?.replace(/^["']|["']$/g, "");

                symbols.push(
                    createSymbol(
                        node,
                        "import",
                        source ?? "unknown",
                        parent,
                    ),
                );

                break;
            }

            case "function_declaration": {
                const name = getNodeName(node);

                if (name) {
                    symbols.push(
                        createSymbol(node, "function", name, parent),
                    );
                }

                parent = name;
                break;
            }

            case "class_declaration": {
                const name = getNodeName(node);

                if (name) {
                    symbols.push(
                        createSymbol(node, "class", name, parent),
                    );

                    parent = name;
                }

                break;
            }

            case "method_definition": {
                const nameNode = node
                    .namedChildren()
                    .find(
                        (child: any) =>
                            child.kind() === "property_identifier" ||
                            child.kind() === "identifier",
                    );

                const name = nameNode?.text();

                if (name) {
                    symbols.push(
                        createSymbol(node, "method", name, parent),
                    );
                }

                break;
            }

            case "interface_declaration": {
                const name = getNodeName(node);

                if (name) {
                    symbols.push(
                        createSymbol(node, "interface", name, parent),
                    );

                    parent = name;
                }

                break;
            }

            case "type_alias_declaration": {
                const name = getNodeName(node);

                if (name) {
                    symbols.push(
                        createSymbol(node, "type_alias", name, parent),
                    );
                }

                break;
            }

            case "lexical_declaration": {
                for (const child of node.namedChildren()) {
                    if (child.kind() !== "variable_declarator") {
                        continue;
                    }

                    const nameNode = child
                        .namedChildren()
                        .find(
                            (node: any) =>
                                node.kind() === "identifier",
                        );

                    const name = nameNode?.text();

                    if (name) {
                        symbols.push(
                            createSymbol(
                                node,
                                "variable",
                                name,
                                parent,
                            ),
                        );
                    }
                }

                break;
            }
        }

        for (const child of node.namedChildren()) {
            extractSymbols(child, symbols, parent);
        }
    } catch (error) {
        console.error("Error extracting symbols:", error);
    }
}