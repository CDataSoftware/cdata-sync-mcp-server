// src/index.ts - Main entry point
import { CDataMCPServer } from './server/CDataMCPServer.js';
import { CDataConfig } from './types/config.js';

// Load configuration from environment
const config: CDataConfig = {
  baseUrl: process.env.CDATA_BASE_URL || "http://localhost:8181/api.rsc",
  authToken: process.env.CDATA_AUTH_TOKEN,
  username: process.env.CDATA_USERNAME,
  password: process.env.CDATA_PASSWORD,
};

const server = new CDataMCPServer(config);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.error("Shutting down gracefully...");
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

console.error("CData Sync MCP Server initializing...");

export { CDataMCPServer, CDataConfig };