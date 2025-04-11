import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { createVectorIndex } from './vector-service';
import { ApiEndpoint, ApiSchema, ApiSpecification } from '../types/api-types';

// In-memory storage for parsed OpenAPI specification
let apiSpecification: ApiSpecification | null = null;
let endpointIndex: Map<string, ApiEndpoint> = new Map();
let schemaIndex: Map<string, ApiSchema> = new Map();

/**
 * Initializes the OpenAPI specification index by parsing the OpenAPI document
 */
export async function initializeOpenApiIndex(): Promise<void> {
  try {
    const openApiPath = path.resolve(process.cwd(), 'openapi/tusky-openapi-v1.37.4.json');
    
    // Check if the file exists
    try {
      await fs.access(openApiPath);
    } catch (error) {
      logger.error(`OpenAPI specification file not found at ${openApiPath}`);
      throw new Error('OpenAPI specification file not found');
    }
    
    // Parse the OpenAPI specification
    logger.info(`Parsing OpenAPI specification from ${openApiPath}`);
    const api = await SwaggerParser.parse(openApiPath);
    
    // Validate the specification
    logger.info('Validating OpenAPI specification');
    await SwaggerParser.validate(openApiPath);
    
    // Extract important sections from the API specification
    const {
      info,
      paths,
      components,
      servers,
    } = api;
    
    // Process API endpoints (paths)
    const endpoints: ApiEndpoint[] = [];
    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const endpoint: ApiEndpoint = {
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId || `${method}${path}`,
            summary: operation.summary || '',
            description: operation.description || '',
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses,
            tags: operation.tags || [],
          };
          
          endpoints.push(endpoint);
          
          // Add to endpoint index for quick lookups
          endpointIndex.set(endpoint.operationId, endpoint);
        }
      }
    }
    
    // Process API schemas (component schemas)
    const schemas: ApiSchema[] = [];
    if (components && components.schemas) {
      for (const [name, schema] of Object.entries(components.schemas)) {
        const apiSchema: ApiSchema = {
          name,
          schema,
          description: schema.description || '',
          properties: schema.properties || {},
          required: schema.required || [],
        };
        
        schemas.push(apiSchema);
        
        // Add to schema index for quick lookups
        schemaIndex.set(name, apiSchema);
      }
    }
    
    // Create the complete API specification object
    apiSpecification = {
      title: info.title,
      version: info.version,
      description: info.description || '',
      baseUrl: servers && servers.length > 0 ? servers[0].url : '',
      endpoints,
      schemas,
    };
    
    // Initialize vector embeddings for semantic search
    logger.info('Creating vector embeddings for semantic search');
    await createVectorIndex(apiSpecification);
    
    logger.info('OpenAPI specification parsed and indexed successfully');
  } catch (error) {
    logger.error('Error parsing OpenAPI specification', error);
    throw error;
  }
}

/**
 * Returns the complete API specification
 */
export function getApiSpecification(): ApiSpecification | null {
  return apiSpecification;
}

/**
 * Returns an API endpoint by its operationId
 */
export function getEndpointByOperationId(operationId: string): ApiEndpoint | undefined {
  return endpointIndex.get(operationId);
}

/**
 * Returns an API schema by its name
 */
export function getSchemaByName(name: string): ApiSchema | undefined {
  return schemaIndex.get(name);
}

/**
 * Returns all API endpoints that match given tags
 */
export function getEndpointsByTags(tags: string[]): ApiEndpoint[] {
  if (!apiSpecification) return [];
  
  return apiSpecification.endpoints.filter(endpoint => 
    tags.some(tag => endpoint.tags.includes(tag))
  );
}