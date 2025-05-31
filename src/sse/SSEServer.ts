// src/sse/SSEServer.ts
import express from "express";
import cors from "cors";

export class SSEServer {
  private app: express.Application;
  private clients: Map<string, express.Response> = new Map();

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

      req.on("close", () => {
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
    if (client) {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcastEvent(event: string, data: any) {
    for (const [clientId] of this.clients) {
      this.sendEvent(clientId, event, data);
    }
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        if (process.env.MCP_MODE) {
          console.error(`SSE server running on port ${port}`);
          console.error(`Events endpoint: http://localhost:${port}/events`);
        }
        resolve();
      });
    });
  }

  getConnectedClientCount(): number {
    return this.clients.size;
  }
}