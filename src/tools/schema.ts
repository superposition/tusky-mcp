import { MCPServer, ToolCallContext } from '@modelcontextprotocol/mcp';
import { getApiSpecification, getSchemaByName, getEndpointByOperationId } from '../services/openapi-parser';
import { logger } from '../utils/logger';
import Joi from 'joi';

/**
 * Register the schema tool with the MCP server
 */
export function registerSchemaTool(server: MCPServer): void {
  server.registerTool({
    name: 'schema',
    description: 'Retrieve complete schema information from the Tusky API',
    parameters: Joi.object({
      name: Joi.string().description('The name of the schema to retrieve'),
      operationId: Joi.string().description('Retrieve schemas related to this operation ID'),
      part: Joi.string().valid('overview', 'properties', 'full').default('full').description('Which part of the schema to retrieve'),
    }).or('name', 'operationId').description('Provide either schema name or operation ID'),
    handler: schemaHandler,
  });
  
  logger.info('Registered schema tool');
}

/**
 * Handle schema tool calls
 */
async function schemaHandler(
  params: {
    name?: string;
    operationId?: string;
    part?: 'overview' | 'properties' | 'full';
  },
  context: ToolCallContext
): Promise<any> {
  try {
    logger.info('Schema tool called', { params });
    
    const { name, operationId, part = 'full' } = params;
    
    // Retrieve schema by name
    if (name) {
      const schema = getSchemaByName(name);
      
      if (!schema) {
        return {
          error: `Schema '${name}' not found in the API specification`,
        };
      }
      
      return formatSchemaResult(schema, part);
    }
    
    // Retrieve schemas related to an operation
    if (operationId) {
      const endpoint = getEndpointByOperationId(operationId);
      
      if (!endpoint) {
        return {
          error: `Operation '${operationId}' not found in the API specification`,
        };
      }
      
      return formatOperationSchemas(endpoint, part);
    }
    
    logger.warn('Neither schema name nor operation ID provided');
    return {
      error: 'Either schema name or operation ID must be provided',
    };
  } catch (error) {
    logger.error('Error in schema tool', error);
    throw new Error(`Failed to retrieve schema information: ${(error as Error).message}`);
  }
}

/**
 * Format schema result based on the requested part
 */
function formatSchemaResult(schema: any, part: 'overview' | 'properties' | 'full'): any {
  switch (part) {
    case 'overview':
      return {
        name: schema.name,
        description: schema.description,
        required: schema.required,
      };
      
    case 'properties':
      return {
        name: schema.name,
        properties: schema.properties,
      };
      
    case 'full':
    default:
      return {
        name: schema.name,
        description: schema.description,
        properties: schema.properties,
        required: schema.required,
        schema: schema.schema,
      };
  }
}

/**
 * Format schemas related to an operation
 */
function formatOperationSchemas(endpoint: any, part: 'overview' | 'properties' | 'full'): any {
  // Collect all schema references from the endpoint
  const schemaRefs = new Set<string>();
  
  // Check request body for schema references
  if (endpoint.requestBody?.content) {
    Object.values(endpoint.requestBody.content).forEach((content: any) => {
      if (content.schema?.$ref) {
        const ref = content.schema.$ref;
        schemaRefs.add(extractSchemaName(ref));
      }
    });
  }
  
  // Check responses for schema references
  if (endpoint.responses) {
    Object.values(endpoint.responses).forEach((response: any) => {
      if (response.content) {
        Object.values(response.content).forEach((content: any) => {
          if (content.schema?.$ref) {
            const ref = content.schema.$ref;
            schemaRefs.add(extractSchemaName(ref));
          }
        });
      }
    });
  }
  
  // Get schemas by name and format them
  const schemas = Array.from(schemaRefs)
    .filter(ref => ref) // Filter out undefined/null references
    .map(ref => getSchemaByName(ref))
    .filter(schema => schema) // Filter out schemas that weren't found
    .map(schema => formatSchemaResult(schema, part));
  
  return {
    operationId: endpoint.operationId,
    schemas,
    count: schemas.length,
  };
}

/**
 * Extract schema name from a $ref
 */
function extractSchemaName(ref: string): string {
  // Format is typically "#/components/schemas/SchemaName"
  const parts = ref.split('/');
  return parts[parts.length - 1];
}