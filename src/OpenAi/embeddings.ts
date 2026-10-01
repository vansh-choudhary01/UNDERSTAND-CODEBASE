import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI();


export async function embed(text: string): Promise<{embedding: number[], model: string, dimensions: number}> {{
  return await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
    dimensions: 1536
  }).then(response => {
    return {
      embedding: response.data[0]?.embedding || [],
      model: response.model,
      dimensions: 1536
    };
  });
}}

export async function embedBatch(texts: string[]): Promise<{embedding: number[], model: string, dimensions: number}[]> {
  const embeddings = await Promise.all(texts.map(embed));
  return embeddings;
}