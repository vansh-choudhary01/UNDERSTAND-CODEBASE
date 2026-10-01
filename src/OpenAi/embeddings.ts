import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI();


export function embed(text: string): Promise<{embedding: number[], model: string, dimensions: number}> {{
  return openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  }).then(response => {
    return {
      embedding: response.data[0]?.embedding || [],
      model: response.model,
      dimensions: '1536'
    };
  });
}}

export async function embedBatch(texts: string[]): Promise<{embedding: number[], model: string, dimensions: number}[]> {
  const embeddings = await Promise.all(texts.map(embed));
  return embeddings;
}