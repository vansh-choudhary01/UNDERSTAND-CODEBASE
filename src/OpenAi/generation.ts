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

export async function generateAns(query: string, context: string, prevContext?: string): Promise<string> {
    const prompt = `
You are an expert software engineer helping a developer understand a codebase.
Use the provided context to answer the question.

prevContext : ${prevContext ? `${prevContext}`: null}

Context:
${context}

Question: ${query}

And please answer in proper markdown format with code blocks where necessary in json.
Please prioritize accuracy and completeness in your response.
If you cannot answer based on the context, please try to use a new query to find the best result from the vector db. and if prevContext is already availabe then you already tryed to fetch with newQuery then generate final response only.
and response only in json format.
{
    "answer": "The answer to the question",
    "confidence": 0.9,
    "relevant_chunks": [
        {
            "file_path": "/path/to/file",
            "symbol_name": "function_name",
            "lines": "10-20",
            "code": "code snippet"
        }
    ],
} or {
    "newQuery": "new query to find better results"
}
`;

    const responseStream = await openai.chat.completions.create({
        model: "gpt-4.1-nano-2025-04-14",
        messages: [
            {
                role: "user",
                content: prompt,
            }
        ],
        temperature: 0,
        max_tokens: 8000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
    });
    let response = "";

    for await (const part of responseStream) {
        response += part.choices[0]?.delta.content || "";

        if (part.choices[0]?.finish_reason) {
            console.log(part.choices[0]?.finish_reason);
        }
    }

    return response;
}
