[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cdatasoftware-cdata-sync-mcp-server-badge.png)](https://mseep.ai/app/cdatasoftware-cdata-sync-mcp-server)

# CData Sync MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-blue?style=for-the-badge)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A comprehensive **Model Context Protocol (MCP) server** for [CData Sync](https://www.cdata.com/sync/) with **dual transport support**. This server exposes CData Sync's REST API as MCP tools, enabling AI assistants like Claude to manage data synchronization jobs, connections, and ETL operations.

**Transport Options:**
- **stdio** - For desktop usage with Claude Desktop app
- **HTTP** - For remote server deployments and API access

## ✨ Features

- 🔧 **20 Consolidated MCP Tools** - Streamlined read/write operations for all entity types
- 🚀 **Dual Transport Support** - Both stdio (Claude Desktop) and Streamable HTTP (web clients)
- 📡 **Real-time Notifications** - Live monitoring of job executions and API calls via Server-Sent Events
- 🏗️ **Production-Ready Architecture** - TypeScript, error handling, logging, and comprehensive type safety
- 🔐 **Multiple Auth Methods** - Support for API tokens and basic authentication
- 🌐 **Web Client Support** - RESTful HTTP API with streaming capabilities
- 📊 **Job Management** - Execute, monitor, and control data sync jobs
- 🔌 **Connection Management** - Test, create, and manage data connections
- 👥 **User Management** - Handle user accounts and permissions
- 📈 **History & Logging** - Access execution history and detailed logs

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- CData Sync instance running
- Claude Desktop (for stdio transport) or web browser (for HTTP transport)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CDataSoftware/cdata-sync-mcp-server.git
   cd cdata-sync-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit with your CData Sync details
   CDATA_BASE_URL="http://localhost:8181/api.rsc"
   CDATA_AUTH_TOKEN="your-auth-token"
   MCP_TRANSPORT_MODE="both"  # stdio, http, or both
   ```

## 🔌 Transport Options

### Desktop Usage: Stdio Transport (Claude Desktop)

The **stdio transport** is designed for local desktop usage with the Claude Desktop app. This is the recommended approach for individual developers.

**Configuration for Claude Desktop:**
```json
{
  "mcpServers": {
    "cdata-sync-server": {
      "command": "node",
      "args": ["/absolute/path/to/cdata-sync-mcp-server/dist/index.js"],
      "env": {
        "MCP_TRANSPORT_MODE": "stdio",
        "CDATA_AUTH_TOKEN": "your-token-here",
        "CDATA_BASE_URL": "http://localhost:8181/api.rsc",
        "DISABLE_SSE": "true"
      }
    }
  }
}
```

**Start stdio-only server:**
```bash
npm run start:stdio
```

### Server Usage: HTTP Transport (Remote Deployments)

The **HTTP transport** is designed for server deployments where the MCP server runs on a remote machine and accepts API requests. This is ideal for:
- Team deployments
- Docker/Kubernetes environments
- Integration with web applications
- Remote access scenarios

**Start HTTP-only server:**
```bash
npm run start:http
```

**Available endpoints:**
- `GET /mcp/v1/info` - Server and protocol information
- `GET /mcp/v1/health` - Health check
- `POST /mcp/v1/message` - Send MCP requests
- `GET /mcp/v1/stream` - Server-Sent Events for real-time updates

**Example HTTP client usage:**
```javascript
// Connect to the server
const client = new MCPStreamableHttpClient('http://your-server:3000/mcp/v1');
await client.connect();

// List available tools
const tools = await client.listTools();

// Call a tool
const connections = await client.callTool('read_connections', {
  action: 'list',
  top: 5
});

// Set up real-time monitoring
client.onNotification = (method, params) => {
  console.log('Notification:', method, params);
};
```

### Development: Dual Transport

For development and testing, you can run both transports simultaneously:

```bash
npm run start:both
```

This is useful for testing both desktop and server scenarios during development.

## 🛠️ Available Tools

### Connection Management
- `read_connections` - List, count, get details, or test connections
- `write_connections` - Create, update, or delete connections  
- `get_connection_tables` - List tables in connection
- `get_table_columns` - Get table schema information

### Job Management  
- `read_jobs` - List, count, get details, status, history, or logs
- `write_jobs` - Create, update, or delete jobs
- `execute_job` - Run a sync job immediately
- `cancel_job` - Stop running job
- `execute_query` - Run custom SQL queries

### Task Management
- `read_tasks` - List, count, or get task details
- `write_tasks` - Create, update, or delete tasks

### Transformation Management
- `read_transformations` - List, count, or get transformation details
- `write_transformations` - Create, update, or delete transformations

### User Management
- `read_users` - List, count, or get user details
- `write_users` - Create or update users

### Request/Log Management
- `read_requests` - List, count, or get request log details
- `write_requests` - Delete request logs

### History Management
- `read_history` - List or count execution history records

### Certificate Management
- `read_certificates` - List certificates
- `write_certificates` - Create certificates

### Configuration Management
- `configure_sync_server` - Get or update server configuration

## 📋 Tool Usage Patterns

### Action-Based Operations

All read/write tools use an `action` parameter to specify the operation:

**Example: Reading connections**
```json
{
  "tool": "read_connections",
  "arguments": {
    "action": "list",
    "filter": "contains(Name,'prod')",
    "top": 10
  }
}
```

**Example: Creating a connection**
```json
{
  "tool": "write_connections", 
  "arguments": {
    "action": "create",
    "name": "MyDatabase",
    "providerName": "System.Data.SqlClient",
    "connectionString": "Server=localhost;Database=test;"
  }
}
```

### Real-time Monitoring

The HTTP transport provides real-time notifications for:
- Tool execution start/completion
- Job execution progress
- Configuration changes
- Error notifications

```javascript
// Monitor all server events
const eventSource = new EventSource('http://localhost:3000/mcp/v1/stream');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.method === 'notifications/job_executed') {
    console.log('Job completed:', message.params);
  }
};
```

## 🔧 Development

### Development Scripts

```bash
# Start in development mode with both transports
npm run dev:both

# Start with stdio only
npm run dev:stdio

# Start with HTTP only
npm run dev:http

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:watch
npm run test:coverage
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CDATA_BASE_URL` | CData Sync API base URL | `http://localhost:8181/api.rsc` |
| `CDATA_AUTH_TOKEN` | API authentication token | - |
| `CDATA_USERNAME` | Basic auth username (alternative to token) | - |
| `CDATA_PASSWORD` | Basic auth password (alternative to token) | - |
| `MCP_TRANSPORT_MODE` | Transport mode: `stdio`, `http`, or `both` | `stdio` |
| `MCP_HTTP_PORT` | HTTP transport port | `3000` |
| `MCP_HTTP_PATH` | HTTP transport base path | `/mcp/v1` |
| `NODE_ENV` | Node environment | `production` |
| `LOG_LEVEL` | Logging level | `info` |

## 🐳 Deployment

### Docker

```bash
# Build image
docker build -t cdata-sync-mcp-server .

# Run with stdio transport
docker run -e CDATA_AUTH_TOKEN=your-token cdata-sync-mcp-server

# Run with HTTP transport
docker run -p 3000:3000 -e MCP_TRANSPORT_MODE=http -e CDATA_AUTH_TOKEN=your-token cdata-sync-mcp-server
```

### Docker Compose

```bash
# Start with Docker Compose
docker-compose up -d cdata-sync-mcp-both
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Systemd Service

```bash
# Install as systemd service
sudo cp cdata-sync-mcp.service /etc/systemd/system/
sudo systemctl enable cdata-sync-mcp
sudo systemctl start cdata-sync-mcp
```

## 📡 HTTP API Reference

### Protocol Information

**GET /mcp/v1/info**
```json
{
  "protocol": "Model Context Protocol",
  "version": "2025-03-26", 
  "transport": "streamable-http",
  "endpoints": {
    "message": "http://localhost:3000/mcp/v1/message",
    "stream": "http://localhost:3000/mcp/v1/stream"
  }
}
```

### Health Check

**GET /mcp/v1/health**
```json
{
  "status": "healthy",
  "transport": "streamable-http",
  "timestamp": "2024-01-15T10:30:00Z",
  "pendingRequests": 0,
  "bufferedMessages": 0
}
```

### Send MCP Request

**POST /mcp/v1/message**
```json
{
  "jsonrpc": "2.0",
  "id": "1", 
  "method": "tools/call",
  "params": {
    "name": "read_connections",
    "arguments": {
      "action": "list",
      "top": 5
    }
  }
}
```

### Real-time Events

**GET /mcp/v1/stream**

Server-Sent Events stream providing real-time notifications:
```
data: {"jsonrpc":"2.0","method":"notifications/tool_execution","params":{"tool":"read_connections","timestamp":"2024-01-15T10:30:00Z"}}

data: {"jsonrpc":"2.0","method":"notifications/job_executed","params":{"jobName":"TestJob","result":"success","timestamp":"2024-01-15T10:31:00Z"}}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Structure

```
src/
├── __tests__/
│   ├── services/           # Service unit tests
│   ├── transport/          # Transport tests
│   ├── integration/        # Integration tests
│   └── utils/             # Utility tests
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Full API documentation available in the [docs](docs/) directory
- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/CDataSoftware/cdata-sync-mcp-server/issues)
- **Discussions**: Community support via [CData Community](https://community.cdata.com)

## 📚 Additional Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-03-26/)
- [CData Sync Documentation](https://www.cdata.com/sync/)
- [Claude Desktop Configuration](https://claude.ai/docs)

---

**Built with ❤️ for the MCP ecosystem**