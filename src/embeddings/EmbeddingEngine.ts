interface EmbeddingProvider {
    embed(text: string): Promise<{embedding: number[], model: string, dimensions: number}>;
    embedBatch(texts: string[]): Promise<{embedding: number[], model: string, dimensions: number}[]>;
}

export interface VectorRecord {
    chunkId: string;
    vector: number[];
    model: string;
    dimensions: number;
}

export class EmbeddingEngine {
    private provider: EmbeddingProvider;

    constructor(provider: EmbeddingProvider) {
        this.provider = provider;
    }

    async embedText(text: string): Promise<{embedding: number[], model: string, dimensions: number}> {
        return this.provider.embed(text);
    }

    async embedTexts(texts: string[]): Promise<{embedding: number[], model: string, dimensions: number}[]> {
        return this.provider.embedBatch(texts);
    }
}