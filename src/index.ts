import dotenv from 'dotenv';
import { createServer } from './server';
import { logger } from './utils/logger';
import { initializeOpenApiIndex } from './services/openapi-parser';

// Load environment variables
dotenv.config();

// Set the port
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  try {
    // Initialize OpenAPI index
    logger.info('Initializing OpenAPI specification index...');
    await initializeOpenApiIndex();
    
    // Create server
    const server = createServer();
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Tusky MCP Server running on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
bootstrap().catch((err) => {
  logger.error('Error during bootstrap', err);
  process.exit(1);
});