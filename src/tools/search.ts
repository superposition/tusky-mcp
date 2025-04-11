import { MCPServer, ToolCallContext } from '@modelcontextprotocol/mcp';
import { searchEndpoints, searchSchemas } from '../services/vector-service';
import { getEndpointsByTags } from '../services/openapi-parser';
import { logger } from '../utils/logger';
import Joi from 'joi';

/**
 * Register the search tool with the MCP server
 */
export function registerSearchTool(server: MCPServer): void {
  server.registerTool({
    name: 'search',
    description: 'Search the Tusky API documentation',
    parameters: Joi.object({
      query: Joi.string().required().description('The search query for Tusky API documentation'),
      type: Joi.string().valid('endpoint', 'schema', 'all').default('all').description('Type of API documentation to search'),
      tags: Joi.array().items(Joi.string()).description('Filter by specific API tags'),
      method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').description('Filter by HTTP method'),
      maxResults: Joi.number().integer().min(1).max(20).default(10).description('Maximum number of results to return'),
    }),
    handler: searchHandler,
  });
  
  logger.info('Registered search tool');
}

/**
 * Handle search tool calls
 */
async function searchHandler(
  params: {
    query: string;
    type?: 'endpoint' | 'schema' | 'all';
    tags?: string[];
    method?: string;
    maxResults?: number;
  },
  context: ToolCallContext
): Promise<any> {
  try {
    logger.info('Search tool called', { params });
    
    const {
      query,
      type = 'all',
      tags,
      method,
      maxResults = 10,
    } = params;
    
    let endpoints: any[] = [];
    let schemas: any[] = [];
    
    // Search for endpoints if requested
    if (type === 'endpoint' || type === 'all') {
      // If tags are provided, filter by tags first
      if (tags && tags.length > 0) {
        endpoints = getEndpointsByTags(tags);
        
        // If method is provided, filter by method as well
        if (method) {
          endpoints = endpoints.filter(endpoint => endpoint.method === method);
        }
        
        // Then use semantic search to rank the results
        if (query) {
          const rankedEndpoints = searchEndpoints(query, endpoints.length);
          
          // Reorder the filtered endpoints based on the semantic search ranking
          const rankedMap = new Map(rankedEndpoints.map((e, i) => [e.operationId, i]));
          endpoints.sort((a, b) => {
            const rankA = rankedMap.has(a.operationId) ? rankedMap.get(a.operationId)! : Number.MAX_SAFE_INTEGER;
            const rankB = rankedMap.has(b.operationId) ? rankedMap.get(b.operationId)! : Number.MAX_SAFE_INTEGER;
            return rankA - rankB;
          });
        }
      } else {
        // No tags provided, use semantic search directly
        endpoints = searchEndpoints(query, maxResults * 2);
        
        // Apply method filter if provided
        if (method) {
          endpoints = endpoints.filter(endpoint => endpoint.method === method);
        }
      }
      
      // Limit to maxResults
      endpoints = endpoints.slice(0, maxResults);
    }
    
    // Search for schemas if requested
    if (type === 'schema' || type === 'all') {
      schemas = searchSchemas(query, maxResults);
    }
    
    logger.info('Search tool completed successfully');
    
    // Format and return the results
    return {
      query,
      type,
      filter: {
        tags: tags || [],
        method: method || 'any',
      },
      endpoints: formatEndpoints(endpoints),
      schemas: formatSchemas(schemas),
      endpointCount: endpoints.length,
      schemaCount: schemas.length,
    };
  } catch (error) {
    logger.error('Error in search tool', error);
    throw new Error(`Failed to search API documentation: ${(error as Error).message}`);
  }
}

/**
 * Format endpoints for better readability
 */
function formatEndpoints(endpoints: any[]): any[] {
  return endpoints.map(endpoint => ({
    operationId: endpoint.operationId,
    path: endpoint.path,
    method: endpoint.method,
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags,
  }));
}

/**
 * Format schemas for better readability
 */
function formatSchemas(schemas: any[]): any[] {
  return schemas.map(schema => ({
    name: schema.name,
    description: schema.description,
    required: schema.required,
  }));
}