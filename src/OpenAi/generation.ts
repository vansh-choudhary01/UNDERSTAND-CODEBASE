import OpenAI from "openai";
import type { SearchResult } from "../RRF/retrival.js";

export function buildContext(results: SearchResult[], maxTokens: number): string {
    const seen = new Set<string>();
    const contextBlocks: string[] = [];
    let estimatedTokens = 0;

    for (const result of results) {
        const chunk = result.chunk;

        if (seen.has(chunk.id)) {
            continue;
        }

        const block = `--- ${chunk.filePath} ---
Symbol: ${chunk.symbolName}
Type: ${chunk.symbolType}
Lines: ${chunk.startLine}-${chunk.endLine}

${chunk.content}
`;

        const blockTokens = Math.ceil(block.length / 4);
        if (estimatedTokens + blockTokens > maxTokens) {
            break;
        }

        contextBlocks.push(block);
        estimatedTokens += blockTokens;

        seen.add(chunk.id);
    }

    return contextBlocks.join("\n");
}

const openai = new OpenAI();

export async function generateAns(query: string, context: string): Promise<string> {
    const prompt = `
You are an expert software engineer helping a developer understand a codebase.
Use the provided context to answer the question.

Context:
${context}

Question: ${query}

Answer:
`;

    return (await openai.chat.completions.create({
        model: "gpt-4.1-nano-2025-04-14",
        messages: [
            {
                role: "user",
                content: prompt,
            }
        ],
        temperature: 0,
        max_tokens: 512,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    })).choices[0]?.message.content ?? "";
}
