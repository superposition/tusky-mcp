import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Validates the API key from the request headers or environment variables
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for health check
  if (req.path === '/health') {
    return next();
  }

  try {
    // Get API key from environment or request
    const configApiKey = process.env.TUSKY_API_KEY;
    
    // For HTTP requests, check the Authorization header
    if (req.headers.authorization) {
      const requestApiKey = req.headers.authorization.replace('Bearer ', '');
      
      if (!configApiKey) {
        logger.warn('No API key configured, skipping validation');
        return next();
      }
      
      if (requestApiKey !== configApiKey) {
        logger.warn('Invalid API key provided');
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      }
    } else if (req.method !== 'GET') {
      // Only enforce API key for non-GET requests if header not present
      if (configApiKey) {
        logger.warn('Missing API key');
        return res.status(401).json({ error: 'Unauthorized: Missing API key' });
      }
    }
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    logger.error('Error validating API key', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}