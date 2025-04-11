import pino from 'pino';

// Determine log level from environment or default to info
const logLevel = process.env.LOG_LEVEL || 'info';

// Create a logger instance
export const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: undefined, // Remove default base properties
});

// Add additional context to log messages
export function createContextLogger(context: string) {
  return logger.child({ context });
}