// src/sse/SSEServer.ts
import express from "express";
import cors from "cors";
import { Server as HttpServer } from "http";

export class SSEServer {
  private app: express.Application;
  private clients: Map<string, express.Response> = new Map();
  private server?: HttpServer;
  private isListening: boolean = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // SSE endpoint for real-time updates
    this.app.get("/events", (req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      const clientId = Date.now().toString();
      this.clients.set(clientId, res);

      // Send initial connection event
      this.sendEvent(clientId, "connected", { 
        clientId, 
        timestamp: new Date().toISOString() 
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          res.write(`:heartbeat\n\n`);
        } catch (error) {
          // Client disconnected
          clearInterval(heartbeat);
        }
      }, 30000);

      req.on("close", () => {
        clearInterval(heartbeat);
        this.clients.delete(clientId);
      });

      req.on("error", () => {
        clearInterval(heartbeat);
        this.clients.delete(clientId);
      });
    });

    // Health check endpoint
    this.app.get("/health", (_req, res) => {
      res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        connectedClients: this.clients.size
      });
    });
  }

  sendEvent(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && !client.destroyed) {
      try {
        client.write(`event: ${event}\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        // Client disconnected, remove from map
        this.clients.delete(clientId);
      }
    }
  }

  broadcastEvent(event: string, data: any) {
    const deadClients: string[] = [];
    
    for (const [clientId, client] of this.clients) {
      try {
        if (!client.destroyed) {
          client.write(`event: ${event}\n`);
          client.write(`data: ${JSON.stringify(data)}\n\n`);
        } else {
          deadClients.push(clientId);
        }
      } catch (error) {
        deadClients.push(clientId);
      }
    }
    
    // Clean up dead clients
    deadClients.forEach(clientId => this.clients.delete(clientId));
  }

  async listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          this.isListening = true;
          console.error(`[SSE Server] Debug event server running on port ${port}`);
          console.error(`[SSE Server] Events endpoint: http://localhost:${port}/events`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`[SSE Server] Port ${port} is already in use. Debug events disabled.`);
            this.isListening = false;
            // Don't reject - just disable SSE functionality
            resolve();
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      // Close all client connections
      for (const [_clientId, res] of this.clients) {
        try {
          res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      }
      this.clients.clear();

      // Close the HTTP server
      if (this.server && this.isListening) {
        this.server.close(() => {
          this.isListening = false;
          console.error('[SSE Server] Debug event server closed');
          resolve();
        });

        // Force close after timeout
        setTimeout(() => {
          if (this.server && this.isListening) {
            this.server.closeAllConnections();
            resolve();
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  getConnectedClientCount(): number {
    return this.clients.size;
  }

  isRunning(): boolean {
    return this.isListening;
  }
}