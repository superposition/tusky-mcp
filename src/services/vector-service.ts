import vectorizeText from 'vectorize-text';
import { ApiEndpoint, ApiSchema, ApiSpecification } from '../types/api-types';
import { logger } from '../utils/logger';

// Vector embedding storage
const endpointVectors: Array<{ endpoint: ApiEndpoint; vector: number[] }> = [];
const schemaVectors: Array<{ schema: ApiSchema; vector: number[] }> = [];

/**
 * Creates vector embeddings for all endpoints and schemas
 */
export async function createVectorIndex(apiSpec: ApiSpecification): Promise<void> {
  try {
    // Clear existing indexes
    endpointVectors.length = 0;
    schemaVectors.length = 0;
    
    // Create embeddings for endpoints
    for (const endpoint of apiSpec.endpoints) {
      const textToVectorize = [
        endpoint.summary,
        endpoint.description,
        endpoint.path,
        endpoint.operationId,
        endpoint.tags.join(' '),
      ].join(' ');
      
      const vector = vectorizeText(textToVectorize);
      
      endpointVectors.push({
        endpoint,
        vector,
      });
    }
    
    // Create embeddings for schemas
    for (const schema of apiSpec.schemas) {
      const propertyDescriptions = Object.entries(schema.properties)
        .map(([name, prop]) => `${name}: ${prop.description || ''}`)
        .join(' ');
      
      const textToVectorize = [
        schema.name,
        schema.description,
        propertyDescriptions,
      ].join(' ');
      
      const vector = vectorizeText(textToVectorize);
      
      schemaVectors.push({
        schema,
        vector,
      });
    }
    
    logger.info(
      `Created vector embeddings for ${endpointVectors.length} endpoints and ${schemaVectors.length} schemas`
    );
  } catch (error) {
    logger.error('Error creating vector embeddings', error);
    throw error;
  }
}

/**
 * Performs a semantic search over API endpoints
 */
export function searchEndpoints(query: string, limit = 5): ApiEndpoint[] {
  try {
    const queryVector = vectorizeText(query);
    
    const results = endpointVectors
      .map(({ endpoint, vector }) => ({
        endpoint,
        similarity: cosineSimilarity(queryVector, vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => result.endpoint);
    
    return results;
  } catch (error) {
    logger.error('Error during endpoint semantic search', error);
    return [];
  }
}

/**
 * Performs a semantic search over API schemas
 */
export function searchSchemas(query: string, limit = 5): ApiSchema[] {
  try {
    const queryVector = vectorizeText(query);
    
    const results = schemaVectors
      .map(({ schema, vector }) => ({
        schema,
        similarity: cosineSimilarity(queryVector, vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => result.schema);
    
    return results;
  } catch (error) {
    logger.error('Error during schema semantic search', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}