// src/index.ts - Main entry point with dual transport support
import { CDataMCPServer } from './server/CDataMCPServer.js';
import { CDataConfig } from './types/config.js';

// Transport mode configuration
export type TransportMode = 'stdio' | 'http' | 'both';

// Load configuration from environment
const config: CDataConfig = {
  baseUrl: process.env.CDATA_BASE_URL || "http://localhost:8181/api.rsc",
  authToken: process.env.CDATA_AUTH_TOKEN,
  username: process.env.CDATA_USERNAME,
  password: process.env.CDATA_PASSWORD,
  workspace: process.env.CDATA_WORKSPACE || "default", // Workspace ID
};

// Determine transport mode (default to stdio)
const transportMode: TransportMode = (process.env.MCP_TRANSPORT_MODE as TransportMode) || 'stdio';
const httpPort = parseInt(process.env.MCP_HTTP_PORT || '3000', 10);
const ssePort = parseInt(process.env.SSE_PORT || '3001', 10);
const disableSSE = process.env.DISABLE_SSE === 'true';

// Create logger based on transport mode
const log = (message: string) => {
  if (transportMode === 'stdio') {
    // Use stderr for stdio transport to avoid interfering with protocol
    console.error(`[MCP Server] ${message}`);
  } else {
    // Use stdout for HTTP transport
    console.log(`[MCP Server] ${message}`);
  }
};

// Validate configuration
async function validateConfig(config: CDataConfig): Promise<void> {
  // Allow empty baseUrl - it can be configured later
  if (!config.baseUrl) {
    log('Warning: No CDATA_BASE_URL provided. Default is http://localhost:8181/api.rsc.');
  }
  
  // Allow server to start without credentials - they will be prompted when needed
  if (!config.authToken && (!config.username || !config.password)) {
    log('Warning: No authentication credentials provided. You will be prompted when accessing CData Sync.');
  }
}

// Handle graceful shutdown
let server: CDataMCPServer | null = null;
let isShuttingDown = false;

async function shutdown(signal: string = 'SIGTERM') {
  if (isShuttingDown) {
    return; // Prevent multiple shutdown attempts
  }
  
  isShuttingDown = true;
  log(`Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    try {
      await server.stop();
      log("Server stopped successfully");
    } catch (error) {
      console.error("[MCP Server] Error during shutdown:", error);
    }
  }
  
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error("[MCP Server] Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  
  process.exit(0);
}

// Handle various shutdown signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("[MCP Server] Uncaught exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[MCP Server] Unhandled rejection at:", promise, "reason:", reason);
  shutdown("unhandledRejection");
});

// Main startup
async function main() {
  try {
    await validateConfig(config);
    
    log(`Starting CData Sync MCP Server in ${transportMode} mode...`);
    
    server = new CDataMCPServer(config, transportMode === 'stdio');
    
    // Start with appropriate transport
    switch (transportMode) {
      case 'stdio':
        await server.startStdio(disableSSE ? undefined : ssePort);
        log("CData Sync MCP Server started with stdio transport");
        log("Ready to accept MCP commands via stdio");
        if (!disableSSE && ssePort) {
          log(`Debug events available at http://localhost:${ssePort}/events (optional)`);
        }
        break;
        
      case 'http':
        await server.startHttp(httpPort);
        log(`CData Sync MCP Server started with HTTP transport on port ${httpPort}`);
        log(`MCP endpoints available at:`);
        log(`  - Info: http://localhost:${httpPort}/mcp/v1/info`);
        log(`  - Message: http://localhost:${httpPort}/mcp/v1/message`);
        log(`  - Stream: http://localhost:${httpPort}/mcp/v1/stream`);
        break;
        
      case 'both':
        await server.startBoth(httpPort, disableSSE ? 0 : ssePort);
        log("CData Sync MCP Server started with both transports");
        log("  - Stdio transport: ready");
        log(`  - HTTP transport: port ${httpPort}`);
        if (!disableSSE && ssePort) {
          log(`  - Debug events: http://localhost:${ssePort}/events (optional)`);
        }
        break;
        
      default:
        throw new Error(`Invalid transport mode: ${transportMode}`);
    }
    
  } catch (error) {
    console.error("[MCP Server] Failed to start server:", error);
    process.exit(1);
  }
}

main();

export { CDataMCPServer, CDataConfig };