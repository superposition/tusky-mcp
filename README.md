# Tusky MCP Server

A Model Context Provider (MCP) server for the Tusky API, enabling AI language models like Claude to access and understand the Tusky API documentation.

## Overview

The Tusky MCP Server serves as a bridge between language models and the Tusky API, which is a decentralized file system built on the Walrus Protocol and SUI blockchain. This server parses the OpenAPI specification for the Tusky API, indexes it, and provides a semantic search interface that allows language models to quickly retrieve relevant documentation based on user queries.

## Features

- **OpenAPI Specification Parsing**: Automatically parses and indexes the Tusky API OpenAPI specification.
- **Semantic Search**: Performs vector-based semantic search to find the most relevant API documentation for user queries.
- **Deterministic Retrieval**: Supports direct retrieval of specific API entities by name or ID.
- **Query Classification**: Intelligently classifies user queries to determine the most relevant context to return.
- **MCP Protocol Support**: Implements the Model Context Protocol (MCP) standard for seamless integration with language models.
- **Containerized Deployment**: Packaged as a Docker container for easy deployment.

## Tools

The server exposes the following MCP tools:

- **retrieve**: Get relevant Tusky API documentation based on a user query.
- **search**: Search the Tusky API documentation with filters for types, tags, and methods.
- **schema**: Retrieve complete schema information from the Tusky API.

## Installation

### Prerequisites

- Docker
- Node.js 16+ (for local development)

### Using Docker

```bash
docker pull ghcr.io/superposition/tusky-mcp-server
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/superposition/tusky-mcp-server.git
cd tusky-mcp-server

# Install dependencies
npm install

# Start development server
npm run dev
```

## Configuration

The server can be configured using environment variables:

- `PORT`: The port on which the server listens (default: 3000)
- `TUSKY_API_KEY`: Your Tusky API key for authentication
- `LOG_LEVEL`: Logging level (default: info)

## Using with Claude

To use the Tusky MCP Server with Claude, add the following configuration to your Claude settings:

```json
{
  "mcpServers": {
    "tusky": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "TUSKY_API_KEY",
        "ghcr.io/superposition/tusky-mcp-server"
      ],
      "env": {
        "TUSKY_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

## Docker Compose

For easier local development and testing, a Docker Compose configuration is provided:

```bash
# Start the server with Docker Compose
docker-compose up

# Stop the server
docker-compose down
```

## API Reference

### MCP Endpoints

The MCP Server exposes tools that can be called by language models:

#### `retrieve` Tool

Get relevant Tusky API documentation based on a user query.

Parameters:
- `query` (string, required): The user query or question about the Tusky API
- `includeSchemas` (boolean, optional): Whether to include related schema definitions (default: true)
- `maxResults` (number, optional): Maximum number of results to return (default: 5, max: 10)

#### `search` Tool

Search the Tusky API documentation.

Parameters:
- `query` (string, required): The search query for Tusky API documentation
- `type` (string, optional): Type of API documentation to search ('endpoint', 'schema', 'all', default: 'all')
- `tags` (array, optional): Filter by specific API tags
- `method` (string, optional): Filter by HTTP method ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
- `maxResults` (number, optional): Maximum number of results to return (default: 10, max: 20)

#### `schema` Tool

Retrieve complete schema information from the Tusky API.

Parameters:
- `name` (string, optional): The name of the schema to retrieve
- `operationId` (string, optional): Retrieve schemas related to this operation ID
- `part` (string, optional): Which part of the schema to retrieve ('overview', 'properties', 'full', default: 'full')

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.