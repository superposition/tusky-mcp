import express, { Express, Request, Response, NextFunction } from 'express';
import { MCPServer, StdioTransport } from '@modelcontextprotocol/mcp';
import { logger } from './utils/logger';
import { registerTools } from './tools';
import { validateApiKey } from './middleware/auth';

export function createServer(): Express {
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // Validate API key for all other routes
  app.use(validateApiKey);
  
  // MCP HTTP endpoint - this would be used for HTTP transport
  app.post('/mcp', async (req, res) => {
    try {
      // Implementation for HTTP transport would go here
      res.status(200).json({ message: 'HTTP transport not yet implemented' });
    } catch (error) {
      logger.error('Error in MCP HTTP endpoint', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  // Initialize MCP server with stdio transport for Docker container
  // This will be the primary transport method when used with Claude
  initializeMcpServer();
  
  return app;
}

function initializeMcpServer() {
  try {
    // Create MCP server with stdio transport for use with Claude
    const mcpServer = new MCPServer({
      name: 'tusky-mcp-server',
      version: '1.0.0',
      transport: new StdioTransport()
    });
    
    // Register tools
    registerTools(mcpServer);
    
    // Start MCP server
    mcpServer.start().catch((err) => {
      logger.error('Failed to start MCP server', err);
      process.exit(1);
    });
    
    logger.info('MCP Server started with stdio transport');
  } catch (error) {
    logger.error('Error initializing MCP server', error);
    throw error;
  }
}