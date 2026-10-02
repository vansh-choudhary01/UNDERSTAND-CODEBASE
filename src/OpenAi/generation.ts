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

Your job is to answer the user's question using ONLY the provided context.

prevContext:
${prevContext ?? "null"}

Context:
${context}

Question:
${query}

IMPORTANT RULES:

1. If the context contains enough information to answer the question:
   - Return the final answer.
   - Do NOT generate a newQuery.

2. If the context does NOT contain enough information:
   - DO NOT guess.
   - DO NOT make assumptions.
   - DO NOT return an answer with empty relevant_chunks.
   - You MUST return a newQuery that can be used to search the vector database for the missing information.

3. If prevContext is NOT null:
   - A previous search has already been performed.
   - Use the new context together with prevContext.
   - If there is enough information, return the final answer.
   - If there is still not enough information, return the best final answer possible based ONLY on the available context.
   - Do NOT return another newQuery.

4. The newQuery should be a specific search query targeting the missing information.
   Example:
   User question: "Where is the repository cloned?"
   Bad newQuery: "repository"
   Good newQuery: "git clone repository deployment clone function exec git command"

5. Never invent code, file paths, functions, or behavior that is not present in the context.

Return ONLY valid JSON.

For a final answer:
{
  "answer": "The answer based only on the provided context.",
  "confidence": 0.0,
  "relevant_chunks": [
    {
      "file_path": "/path/to/file",
      "symbol_name": "function_name",
      "lines": "10-20",
      "code": "relevant code snippet"
    }
  ]
}

OR, when more retrieval is required:
{
  "newQuery": "specific query for the missing information"
}

Do not return both objects.
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

        // if (part.choices[0]?.finish_reason) {
        //     console.log(part.choices[0]?.finish_reason);
        // }
    }

    return response;
}
