FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose default port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "try { require('http').request({ host: 'localhost', port: '3000', path: '/health', timeout: 2000 }, (r) => { process.exit(r.statusCode !== 200); }).end(); } catch (e) { process.exit(1); }"

# Run the application
CMD ["node", "index.js"]
