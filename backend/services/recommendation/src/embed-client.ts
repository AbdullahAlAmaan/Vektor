import { env } from '@vektor/shared';

interface EmbedResponse {
  embedding: number[];
}

interface EmbedBatchResponse {
  embeddings: number[][];
}

/**
 * Generate a single embedding vector for a text string.
 * Returns null if the embedding service is unavailable.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${env.ML_SCORER_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as EmbedResponse;
    return data.embedding;
  } catch {
    return null;
  }
}

/**
 * Generate embeddings for a batch of texts.
 * Returns null if the embedding service is unavailable.
 */
export async function batchEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  try {
    const response = await fetch(`${env.ML_SCORER_URL}/embed/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(60_000), // batch can be slow
    });
    if (!response.ok) return null;
    const data = (await response.json()) as EmbedBatchResponse;
    return data.embeddings;
  } catch {
    return null;
  }
}

/**
 * Cosine similarity between two vectors (used as fallback when pgvector isn't queried).
 */
export function vectorSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/**
 * Format a JS number[] as the PostgreSQL vector literal `[x,x,x,...]`
 * used in raw SQL: `embedding = $1::vector`
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
