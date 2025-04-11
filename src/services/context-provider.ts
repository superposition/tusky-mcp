import {
  getApiSpecification,
  getEndpointByOperationId,
  getSchemaByName,
  getEndpointsByTags
} from './openapi-parser';
import { searchEndpoints, searchSchemas } from './vector-service';
import { classifyQuery } from './query-classifier';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';
import { QueryClassification } from '../types/api-types';

// Cache for query results
const queryCache = new NodeCache({
  stdTTL: 300, // 5 minutes cache expiration
  checkperiod: 60, // Check for expired items every 60 seconds
});

/**
 * Process a user query and return relevant context from the Tusky API
 */
export async function getContextForQuery(
  query: string,
  includeSchemas = true,
  limit = 5
): Promise<any> {
  try {
    // Generate a cache key
    const cacheKey = `${query}-${includeSchemas}-${limit}`;
    
    // Check if result is in cache
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Retrieved context from cache', { query });
      return cachedResult;
    }
    
    // Get the API specification
    const apiSpec = getApiSpecification();
    if (!apiSpec) {
      logger.warn('API specification not loaded, cannot provide context');
      return { error: 'API specification not loaded' };
    }
    
    // Classify the query to determine what information is being requested
    const classification = classifyQuery(query);
    
    // Get context based on classification
    const context = await getContextByClassification(classification, query, includeSchemas, limit);
    
    // Cache the result
    queryCache.set(cacheKey, context);
    
    return context;
  } catch (error) {
    logger.error('Error getting context for query', error);
    return { error: 'Failed to retrieve context' };
  }
}

/**
 * Get context based on query classification
 */
async function getContextByClassification(
  classification: QueryClassification,
  query: string,
  includeSchemas = true,
  limit = 5
): Promise<any> {
  switch (classification.type) {
    case 'endpoint': {
      // Handle endpoint specific queries
      if (classification.entities?.operationId) {
        // Get endpoint by operationId
        const endpoint = getEndpointByOperationId(classification.entities.operationId);
        if (endpoint) {
          // Get related schemas if requested
          const relatedSchemas = includeSchemas 
            ? getRelatedSchemas(endpoint)
            : [];
          
          return {
            type: 'endpoint',
            data: {
              endpoint,
              relatedSchemas,
            },
          };
        }
      }
      
      // If no specific endpoint was identified or found, search by tags and method
      if (classification.entities?.tags?.length || classification.entities?.method) {
        let endpoints = [];
        
        if (classification.entities?.tags?.length) {
          // Get endpoints by tags
          endpoints = getEndpointsByTags(classification.entities.tags);
          
          // Further filter by method if available
          if (classification.entities?.method) {
            endpoints = endpoints.filter(
              endpoint => endpoint.method === classification.entities?.method
            );
          }
        } else if (classification.entities?.method) {
          // Search for endpoints matching the method using semantic search
          endpoints = searchEndpoints(query, limit * 2).filter(
            endpoint => endpoint.method === classification.entities?.method
          );
        }
        
        // Limit results
        endpoints = endpoints.slice(0, limit);
        
        return {
          type: 'endpoints',
          data: {
            endpoints,
            method: classification.entities?.method,
            tags: classification.entities?.tags,
          },
        };
      }
      
      // Fallback to semantic search
      return getContextBySemantic(query, includeSchemas, limit);
    }
    
    case 'schema': {
      // Handle schema specific queries
      if (classification.entities?.schemaName) {
        // Get schema by name
        const schema = getSchemaByName(classification.entities.schemaName);
        if (schema) {
          return {
            type: 'schema',
            data: {
              schema,
            },
          };
        }
      }
      
      // Fallback to schema semantic search
      const schemas = searchSchemas(query, limit);
      return {
        type: 'schemas',
        data: {
          schemas,
        },
      };
    }
    
    case 'general':
    default:
      // Handle general API queries or unknown classifications
      return getContextBySemantic(query, includeSchemas, limit);
  }
}

/**
 * Get context using semantic search
 */
function getContextBySemantic(
  query: string,
  includeSchemas = true,
  limit = 5
): any {
  // Search for relevant endpoints
  const endpoints = searchEndpoints(query, limit);
  
  // Search for relevant schemas if requested
  const schemas = includeSchemas ? searchSchemas(query, limit) : [];
  
  // Get API overview
  const apiSpec = getApiSpecification();
  const overview = {
    title: apiSpec?.title || '',
    version: apiSpec?.version || '',
    description: apiSpec?.description || '',
    baseUrl: apiSpec?.baseUrl || '',
  };
  
  return {
    type: 'general',
    data: {
      overview,
      endpoints,
      schemas,
    },
  };
}

/**
 * Get schemas related to an endpoint
 */
function getRelatedSchemas(endpoint: any): any[] {
  const schemaNames = new Set<string>();
  const relatedSchemas: any[] = [];
  
  // Check request body for schemas
  if (endpoint.requestBody?.content) {
    Object.values(endpoint.requestBody.content).forEach((content: any) => {
      if (content.schema?.$ref) {
        const schemaName = extractSchemaName(content.schema.$ref);
        if (schemaName) schemaNames.add(schemaName);
      }
    });
  }
  
  // Check responses for schemas
  if (endpoint.responses) {
    Object.values(endpoint.responses).forEach((response: any) => {
      if (response.content) {
        Object.values(response.content).forEach((content: any) => {
          if (content.schema?.$ref) {
            const schemaName = extractSchemaName(content.schema.$ref);
            if (schemaName) schemaNames.add(schemaName);
          }
        });
      }
    });
  }
  
  // Get schemas by name
  schemaNames.forEach(name => {
    const schema = getSchemaByName(name);
    if (schema) {
      relatedSchemas.push(schema);
    }
  });
  
  return relatedSchemas;
}

/**
 * Extract schema name from $ref
 */
function extractSchemaName(ref: string): string | null {
  // Format is typically "#/components/schemas/SchemaName"
  const parts = ref.split('/');
  return parts[parts.length - 1] || null;
}