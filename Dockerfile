# Multi-stage Dockerfile for CData Sync MCP Server
# Supports both stdio and HTTP transports

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and tsconfig (needed for prepare script)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip prepare script during install)
RUN npm ci --ignore-scripts

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Runtime stage
FROM node:20-alpine

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Environment variables with defaults
ENV NODE_ENV=production \
    MCP_TRANSPORT_MODE=http \
    MCP_HTTP_PORT=3000 \
    SSE_PORT=3001 \
    DISABLE_SSE=false \
    CDATA_BASE_URL=http://localhost:8181/api.rsc

# Expose ports
EXPOSE 3000 3001

# Health check for HTTP transport
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${MCP_HTTP_PORT}/mcp/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js"]