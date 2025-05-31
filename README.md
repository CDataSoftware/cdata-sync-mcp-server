# 🧠 CData Sync MCP Server

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-blue.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![CData Sync](https://img.shields.io/badge/CData-Sync-0072C6)](https://www.cdata.com/sync/)

A **Model Context Protocol (MCP)** server for managing and operating [CData Sync](https://www.cdata.com/sync/) through its REST API. This server enables AI agents to orchestrate data synchronization jobs, manage connections, and monitor ETL operations.

---

## ✨ Features

- ✅ Execute and monitor data synchronization jobs
- 🔄 Manage data connections and test connectivity
- ⚙️ Create and modify ETL tasks and transformations
- 📚 Access job history, logs, and execution status

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- A **CData Sync** instance running
- An **API Token** or **username/password** for authentication

---

## ⚙️ Setup

### Installing via Smithery

To install CData Sync MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@cdatasoftware/cdata-sync-mcp-server):

```bash
npx -y @smithery/cli install @cdatasoftware/cdata-sync-mcp-server --client claude
```

### Manual Installation
1. **Clone the repository**

   ```bash
   git clone https://github.com/cdatasoftware/cdata-sync-mcp-server.git
   cd cdata-sync-mcp-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file with the following content:

   ```env
   CDATA_BASE_URL=http://localhost:8181/api.rsc
   CDATA_AUTH_TOKEN=your_auth_token

   # Or use basic auth
   # CDATA_USERNAME=your_username
   # CDATA_PASSWORD=your_password

   # Optional
   MCP_MODE=true
   DEBUG_HTTP=false
   ```

---

## ▶️ Running the Server

### Development Mode

Use `ts-node` for live development:

```bash
npm run dev
```

### Production Mode

Build and start:

```bash
npm run build
npm start
```

---

## 🧰 Available Tools

### 🔹 Connection & Job Operations

| Tool       | Description                                         |
|------------|-----------------------------------------------------|
| `configure_sync_server` | Configure MCP server connection to CData Sync |
| `read_connections`  | List, count, get details, or test connections |
| `write_connections` | Create, update, or delete connections |
| `read_jobs`  | List jobs, get status, history, or logs |
| `write_jobs` | Create, update, or delete jobs |
| `execute_job` | Run a job immediately |
| `cancel_job` | Stop a running job |

### 🔹 Data & Metadata Operations

| Tool                   | Description                                 |
|------------------------|---------------------------------------------|
| `read_tasks`          | List, count, or get task details            |
| `write_tasks`         | Create, update, or delete tasks             |
| `execute_query`       | Execute SQL queries in job context          |
| `get_connection_tables` | List tables in a data source              |
| `get_table_columns`   | Get column metadata for a table            |
| `get_job_tables`      | List tables available for a job             |
| `read_transformations` | List transformation details                |
| `write_transformations` | Manage SQL transformations                |

### 🔹 Administrative Operations

| Tool                   | Description                                 |
|------------------------|---------------------------------------------|
| `read_users`          | List user accounts and roles                |
| `write_users`         | Create or update users                      |
| `read_history`        | Access job execution history                |
| `read_requests`       | View API request logs                       |
| `write_requests`      | Delete request logs                         |
| `read_certificates`   | List SSL/TLS certificates                   |
| `write_certificates`  | Upload certificates                         |

---

## 🤖 Usage with LLMs

This server is compatible with AI agents that implement the Model Context Protocol.

### Example (TypeScript + MCP Agent)

```ts
const response = await agent.use_mcp_tool("cdata-sync-mcp-server", "execute_job", {
  jobName: "Daily_Customer_Sync",
  waitForResults: true
});
```

---

## 🐳 Running in Docker

### Build the image

```bash
docker build -t mcp/sync:latest -f Dockerfile .
```

---

## 🧩 Claude Desktop Integration

Add or edit this configuration to your `claude_desktop_config.json` under the `mcpServers` section:

#### 🔹 From Docker

```json
{
  "mcpServers": {
    "cdata-sync": {
      "command": "docker",
      "args": [
        "run", 
        "-i",
        "--rm",
        "--name", "sync-mcp",
        "-e", "CDATA_BASE_URL",
        "-e", "CDATA_AUTH_TOKEN",
        "mcp/sync"
      ],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8181/api.rsc",
        "CDATA_AUTH_TOKEN": "<your-auth-token>"
      }
    }
  }
}
```

#### Via Npx
```json
{
  "mcpServers": {
    "cdata-sync": {
      "command": "npx",
      "args": [
        "-y",
        "@cdatasoftware/cdata-sync-mcp-server"],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8181/api.rsc",
        "CDATA_AUTH_TOKEN": "<your-auth-token>"
      }
    }
  }
}
```
---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).