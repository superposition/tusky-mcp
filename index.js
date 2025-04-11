/**
 * Tusky-MCP Server - Empty Repository Template
 * 
 * This is a minimal starting point for a Model Context Protocol (MCP) server.
 */

// Basic imports
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configure Express middleware
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'tusky-mcp',
    version: '0.1.0',
    description: 'Decentralized file system build on Walrus'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Tusky-MCP server listening on port ${port}`);
});
