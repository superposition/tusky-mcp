import { getApiSpecification } from './openapi-parser';
import { logger } from '../utils/logger';
import { QueryClassification, ApiEndpoint, ApiSchema } from '../types/api-types';

// HTTP method keywords
const methodKeywords: Record<string, string[]> = {
  GET: ['get', 'fetch', 'retrieve', 'read', 'find', 'show', 'list'],
  POST: ['create', 'add', 'post', 'new', 'insert', 'submit'],
  PUT: ['update', 'edit', 'change', 'modify', 'replace', 'put'],
  DELETE: ['delete', 'remove', 'destroy', 'erase'],
  PATCH: ['patch', 'partial update', 'partial edit', 'update part'],
};

/**
 * Classifies a user query to determine what type of information is being requested
 */
export function classifyQuery(query: string): QueryClassification {
  try {
    const apiSpec = getApiSpecification();
    if (!apiSpec) {
      logger.warn('API specification not loaded, cannot classify query');
      return {
        type: 'unknown',
        confidence: 0,
      };
    }
    
    // Normalize query
    const normalizedQuery = query.toLowerCase();
    
    // Extract potential method from query
    const method = extractMethod(normalizedQuery);
    
    // Extract potential tags from query
    const tags = extractTags(normalizedQuery, apiSpec.endpoints);
    
    // Extract potential operationId from query
    const operationId = extractOperationId(normalizedQuery, apiSpec.endpoints);
    
    // Extract potential schema name from query
    const schemaName = extractSchemaName(normalizedQuery, apiSpec.schemas);
    
    // Determine query type based on extracted information
    if (operationId) {
      return {
        type: 'endpoint',
        confidence: 0.9,
        entities: {
          operationId,
          method: method || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      };
    } else if (schemaName) {
      return {
        type: 'schema',
        confidence: 0.8,
        entities: {
          schemaName,
        },
      };
    } else if (tags.length > 0 && method) {
      return {
        type: 'endpoint',
        confidence: 0.7,
        entities: {
          tags,
          method,
        },
      };
    } else if (tags.length > 0) {
      return {
        type: 'general',
        confidence: 0.6,
        entities: {
          tags,
        },
      };
    } else if (method) {
      return {
        type: 'general',
        confidence: 0.5,
        entities: {
          method,
        },
      };
    }
    
    // Default case if no specific information is found
    return {
      type: 'general',
      confidence: 0.3,
    };
  } catch (error) {
    logger.error('Error classifying query', error);
    return {
      type: 'unknown',
      confidence: 0,
    };
  }
}

/**
 * Extracts potential HTTP method from query
 */
function extractMethod(query: string): string | null {
  // Check for explicit method mentions
  for (const [method, keywords] of Object.entries(methodKeywords)) {
    for (const keyword of keywords) {
      if (query.includes(keyword)) {
        return method;
      }
    }
  }
  
  return null;
}

/**
 * Extracts potential tags from query
 */
function extractTags(query: string, endpoints: ApiEndpoint[]): string[] {
  // Get all unique tags from endpoints
  const allTags = new Set<string>();
  for (const endpoint of endpoints) {
    for (const tag of endpoint.tags) {
      allTags.add(tag.toLowerCase());
    }
  }
  
  // Find tags mentioned in the query
  const matchedTags: string[] = [];
  for (const tag of allTags) {
    if (query.includes(tag.toLowerCase())) {
      matchedTags.push(tag);
    }
  }
  
  return matchedTags;
}

/**
 * Extracts potential operationId from query
 */
function extractOperationId(query: string, endpoints: ApiEndpoint[]): string | null {
  // Check for exact or partial operationId matches
  for (const endpoint of endpoints) {
    const operationId = endpoint.operationId.toLowerCase();
    
    // Check for exact match
    if (query.includes(operationId)) {
      return endpoint.operationId;
    }
    
    // Check for partial match (camelCase to words conversion)
    const words = operationId.replace(/([A-Z])/g, ' $1').toLowerCase();
    if (query.includes(words)) {
      return endpoint.operationId;
    }
  }
  
  return null;
}

/**
 * Extracts potential schema name from query
 */
function extractSchemaName(query: string, schemas: ApiSchema[]): string | null {
  // Check for schema name matches
  for (const schema of schemas) {
    const schemaName = schema.name.toLowerCase();
    
    // Check for exact match
    if (query.includes(schemaName)) {
      return schema.name;
    }
    
    // Check for partial match (camelCase to words conversion)
    const words = schemaName.replace(/([A-Z])/g, ' $1').toLowerCase();
    if (query.includes(words)) {
      return schema.name;
    }
  }
  
  return null;
}