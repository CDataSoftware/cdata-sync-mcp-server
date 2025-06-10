// src/transport/StreamableHttpTransport.ts
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, JSONRPCNotification } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { createErrorResponse, JSONRPCErrorCodes } from "../types/jsonrpc.js";

interface PendingRequest {
  resolve: (value: JSONRPCResponse) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

interface StreamableHttpConfig {
  port: number;
  path?: string;
  cors?: boolean;
  timeout?: number;
}

export class StreamableHttpTransport implements Transport {
  private app: express.Application;
  private server: any;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private config: Required<StreamableHttpConfig>;
  private messageBuffer: JSONRPCMessage[] = [];
  private isStarted = false;

  // Transport interface
  onMessage?: (message: JSONRPCMessage) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;

  constructor(config: StreamableHttpConfig) {
    this.config = {
      port: config.port,
      path: config.path || '/mcp/v1',
      cors: config.cors ?? true,
      timeout: config.timeout || 30000
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    if (this.config.cors) {
      this.app.use(cors({
        origin: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-client-id'],
        credentials: true
      }));
    }

    this.app.use(express.json({
      limit: '10mb',
      type: 'application/json'
    }));

    // Request logging middleware
    this.app.use((req, _res, next) => {
      console.log(`[HTTP Transport] ${req.method} ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[HTTP Transport] Error:', err);
      
      if (!res.headersSent) {
        // Send error response without typing it as JSONRPCResponse
        // since JSONRPCResponse requires either result or error, not both
        const errorResponse = createErrorResponse(
          null,
          JSONRPCErrorCodes.INTERNAL_ERROR,
          "Internal error",
          process.env.NODE_ENV === 'development' ? err.message : undefined
        );
        
        res.status(500).json(errorResponse);
      }
    });
  }

  private setupRoutes(): void {
    const basePath = this.config.path;

    // Health check endpoint
    this.app.get(`${basePath}/health`, (_req, res) => {
      res.json({
        status: 'healthy',
        transport: 'streamable-http',
        timestamp: new Date().toISOString(),
        pendingRequests: this.pendingRequests.size,
        bufferedMessages: this.messageBuffer.length
      });
    });

    // MCP info endpoint
    this.app.get(`${basePath}/info`, (req, res) => {
      res.json({
        protocol: 'Model Context Protocol',
        version: '0.1.0',
        transport: 'streamable-http',
        server: 'cdata-sync-mcp-server',
        endpoints: {
          message: `${req.protocol}://${req.get('host')}${basePath}/message`,
          stream: `${req.protocol}://${req.get('host')}${basePath}/stream`,
          health: `${req.protocol}://${req.get('host')}${basePath}/health`
        },
        features: [
          'bidirectional-communication',
          'streaming-responses',
          'request-response-correlation'
        ]
      });
    });

    // Single message endpoint (for request-response)
    this.app.post(`${basePath}/message`, async (req, res) => {
      try {
        const message = this.validateMessage(req.body);
        
        if (this.isRequest(message)) {
          // Handle request from client
          const response = await this.handleClientRequest(message);
          res.json(response);
        } else {
          // Handle response/notification from client
          this.handleClientMessage(message);
          res.status(204).send(); // No Content
        }
      } catch (error: any) {
        // Create error response with proper structure
        const errorId = req.body?.id !== undefined ? req.body.id : null;
        const errorResponse = createErrorResponse(
          errorId,
          JSONRPCErrorCodes.INVALID_REQUEST,
          "Invalid Request",
          error.message
        );
        res.status(400).json(errorResponse);
      }
    });

    // Streaming endpoint (for server-initiated messages)
    this.app.get(`${basePath}/stream`, (req, res) => {
      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send any buffered messages
      this.messageBuffer.forEach(message => {
        this.sendSSEMessage(res, message);
      });
      this.messageBuffer = [];

      // Store response object for future messages
      const clientId = req.headers['x-mcp-client-id'] as string || uuidv4();
      this.storeStreamConnection(clientId, res);

      // Handle client disconnect
      req.on('close', () => {
        this.removeStreamConnection(clientId);
        console.log(`[HTTP Transport] Client ${clientId} disconnected from stream`);
      });

      req.on('error', (error) => {
        console.error(`[HTTP Transport] Stream error for client ${clientId}:`, error);
        this.removeStreamConnection(clientId);
      });

      // Send initial connection confirmation
      this.sendSSEMessage(res, {
        jsonrpc: "2.0",
        method: "transport/connected",
        params: {
          clientId,
          timestamp: new Date().toISOString()
        }
      } as JSONRPCNotification);
    });
  }

  private streamConnections = new Map<string, express.Response>();

  private storeStreamConnection(clientId: string, res: express.Response): void {
    this.streamConnections.set(clientId, res);
    console.log(`[HTTP Transport] Client ${clientId} connected to stream`);
  }

  private removeStreamConnection(clientId: string): void {
    this.streamConnections.delete(clientId);
  }

  private sendSSEMessage(res: express.Response, message: JSONRPCMessage): void {
    const data = JSON.stringify(message);
    res.write(`data: ${data}\n\n`);
  }

  private validateMessage(body: any): JSONRPCMessage {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid JSON-RPC message format');
    }

    if (body.jsonrpc !== "2.0") {
      throw new Error('Invalid JSON-RPC version');
    }

    return body as JSONRPCMessage;
  }

  private isRequest(message: JSONRPCMessage): message is JSONRPCRequest {
    return 'method' in message && 'id' in message;
  }

  private async handleClientRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout
      });

      // Forward to MCP server
      if (this.onMessage) {
        this.onMessage(request);
      } else {
        clearTimeout(timeout);
        this.pendingRequests.delete(request.id);
        reject(new Error('No message handler available'));
      }
    });
  }

  private handleClientMessage(message: JSONRPCMessage): void {
    if (this.isResponse(message)) {
      // Handle response to server request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        pending.resolve(message);
        return;
      }
    }

    // Forward other messages to MCP server
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  private isResponse(message: JSONRPCMessage): message is JSONRPCResponse {
    return 'id' in message && ('result' in message || 'error' in message);
  }

  // Transport interface implementation
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.isStarted) {
      // Buffer messages if not started yet
      this.messageBuffer.push(message);
      return;
    }

    if (this.isResponse(message)) {
      // Handle response to client request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        pending.resolve(message);
        return;
      }
    }

    // Send to all streaming clients
    this.streamConnections.forEach((res, clientId) => {
      try {
        this.sendSSEMessage(res, message);
      } catch (error) {
        console.error(`[HTTP Transport] Failed to send to client ${clientId}:`, error);
        this.removeStreamConnection(clientId);
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          this.isStarted = true;
          console.log(`[HTTP Transport] Listening on port ${this.config.port}`);
          console.log(`[HTTP Transport] MCP endpoints available at:`);
          console.log(`[HTTP Transport]   Info: http://localhost:${this.config.port}${this.config.path}/info`);
          console.log(`[HTTP Transport]   Message: http://localhost:${this.config.port}${this.config.path}/message`);
          console.log(`[HTTP Transport]   Stream: http://localhost:${this.config.port}${this.config.path}/stream`);
          console.log(`[HTTP Transport]   Health: http://localhost:${this.config.port}${this.config.path}/health`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('[HTTP Transport] Server error:', error);
          if (this.onError) {
            this.onError(error);
          }
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      // Clear all pending requests
      this.pendingRequests.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
        reject(new Error('Transport closing'));
      });
      this.pendingRequests.clear();

      // Close all streaming connections
      this.streamConnections.forEach((res) => {
        try {
          res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      });
      this.streamConnections.clear();

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          this.isStarted = false;
          console.log('[HTTP Transport] Server closed');
          resolve();
        });
      } else {
        resolve();
      }

      if (this.onClose) {
        this.onClose();
      }
    });
  }

  // Utility methods
  getConnectionCount(): number {
    return this.streamConnections.size;
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  getBufferedMessageCount(): number {
    return this.messageBuffer.length;
  }
}