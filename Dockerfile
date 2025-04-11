# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Set node environment
ENV NODE_ENV=production

# Copy only necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy OpenAPI specification
COPY openapi ./openapi

# Create volume mount points
VOLUME ["/app/config", "/app/data"]

# Expose default port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "try { require('http').request({ host: 'localhost', port: '3000', path: '/health', timeout: 2000 }, (r) => { process.exit(r.statusCode !== 200); }).end(); } catch (e) { process.exit(1); }"

# Run the application
CMD ["node", "dist/index.js"]