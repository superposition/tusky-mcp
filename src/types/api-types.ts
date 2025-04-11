/**
 * Represents the entire API specification
 */
export interface ApiSpecification {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  schemas: ApiSchema[];
}

/**
 * Represents an API endpoint
 */
export interface ApiEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  parameters: any[];
  requestBody?: any;
  responses: Record<string, any>;
  tags: string[];
}

/**
 * Represents an API schema (data model)
 */
export interface ApiSchema {
  name: string;
  schema: any;
  description: string;
  properties: Record<string, any>;
  required: string[];
}

/**
 * Represents a search query and its parameters
 */
export interface SearchQuery {
  query: string;
  filters?: {
    tags?: string[];
    method?: string;
    schemaName?: string;
  };
  limit?: number;
}

/**
 * Represents a query classifier result
 */
export interface QueryClassification {
  type: 'endpoint' | 'schema' | 'general' | 'unknown';
  confidence: number;
  entities?: {
    operationId?: string;
    schemaName?: string;
    tags?: string[];
    method?: string;
  };
}