// src/tools/strictToolDefinitions.ts - Production-safe tool definitions
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Helper to create consistent parameter validation patterns
const PATTERNS = {
  username: "^[a-zA-Z0-9_-]{3,50}$",
  jobName: "^[a-zA-Z0-9_-]{3,100}$",
  connectionName: "^[a-zA-Z0-9_-]{3,100}$",
  tableName: "^[a-zA-Z0-9_\\[\\]\\. -]{1,255}$",
  email: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  cron: "^(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|(\\d+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})$"
};

export const strictConnectionTools: Tool[] = [
  {
    name: "read_connections",
    description: "Access data source/destination connections. Use 'list' to see all connections, 'get' for details, 'test' to verify connectivity, or 'count' for total. Connections must be created and tested before being used in jobs.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count", "get", "test"],
          default: "list",
          description: "Operation to perform (required)" 
        },
        name: { 
          type: "string",
          pattern: PATTERNS.connectionName,
          description: "Connection name for get/test actions. Must be 3-100 chars, alphanumeric/underscore/hyphen only." 
        },
        filter: { 
          type: "string",
          maxLength: 500,
          description: "OData filter expression (max 500 chars)" 
        },
        select: { 
          type: "string",
          maxLength: 500,
          description: "Comma-separated properties to include" 
        },
        top: { 
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Results to return (1-1000)" 
        },
        skip: { 
          type: "number",
          minimum: 0,
          description: "Results to skip (0 or greater)" 
        },
        providerName: { 
          type: "string", 
          description: "Provider name for test action" 
        },
        verbosity: { 
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log level: 1=Error, 2=Info, 3=Transfer, 4=Verbose" 
        },
      },
      required: ["action"],
      additionalProperties: false
    },
  },
  {
    name: "write_connections",
    description: "Create, update, or delete connections. CRITICAL: Connection strings contain credentials - must be provided explicitly, cannot be auto-generated. Test connections before use.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["create", "update", "delete"],
          description: "Operation to perform (required)" 
        },
        name: { 
          type: "string",
          pattern: PATTERNS.connectionName,
          description: "Connection name (required). 3-100 chars, alphanumeric/underscore/hyphen only." 
        },
        providerName: { 
          type: "string",
          description: "ADO.NET provider (required for create). Cannot be changed after creation. Examples: 'CData Salesforce', 'System.Data.SqlClient'" 
        },
        connectionString: { 
          type: "string",
          minLength: 10,
          description: "REQUIRED for create/update: Full connection string with credentials. Format varies by provider. NEVER use placeholder values." 
        },
        verbosity: { 
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log level: 1=Error, 2=Info, 3=Transfer, 4=Verbose" 
        },
        requireExplicitConnectionString: {
          type: "boolean",
          default: true,
          description: "When true, reject placeholder connection strings"
        }
      },
      required: ["action", "name"],
      additionalProperties: false,
      if: {
        properties: { action: { const: "create" } }
      },
      then: {
        required: ["action", "name", "providerName", "connectionString"]
      }
    },
  },
];

export const strictJobTools: Tool[] = [
  {
    name: "read_jobs",
    description: "Access and monitor data replication jobs. Use specific job names - do not use placeholder values.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count", "get", "status", "history", "logs"],
          default: "list",
          description: "Operation to perform" 
        },
        jobName: { 
          type: "string",
          pattern: PATTERNS.jobName,
          description: "Job name for get/status/logs. Must be exact existing job name." 
        },
        jobId: { 
          type: "string",
          pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          description: "Job UUID (alternative to jobName)" 
        },
        filter: { 
          type: "string",
          maxLength: 500,
          description: "OData filter expression" 
        },
        select: { 
          type: "string",
          maxLength: 500,
          description: "Properties to include" 
        },
        top: { 
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results (1-1000)" 
        },
        skip: { 
          type: "number",
          minimum: 0,
          description: "Results to skip" 
        },
        orderby: { 
          type: "string",
          maxLength: 200,
          description: "Sort order" 
        },
        pushOnQuery: { 
          type: "boolean",
          description: "Include query details" 
        },
        days: { 
          type: "number",
          minimum: 1,
          maximum: 30,
          description: "Days of logs (1-30)" 
        },
      },
      required: ["action"],
      additionalProperties: false
    },
  },
  {
    name: "write_jobs",
    description: "Create, modify, or delete jobs. CRITICAL: Requires existing, tested connections. Job names must be meaningful. Cannot modify/delete running jobs.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["create", "update", "delete"],
          description: "Operation to perform" 
        },
        jobName: { 
          type: "string",
          pattern: PATTERNS.jobName,
          description: "Unique job name (required). 3-100 chars. Use descriptive names, not placeholders." 
        },
        source: { 
          type: "string",
          pattern: PATTERNS.connectionName,
          description: "Source connection name (required for create). Must be an existing, tested connection." 
        },
        destination: { 
          type: "string",
          pattern: PATTERNS.connectionName,
          description: "Destination connection name (required for create). Must be an existing, tested connection." 
        },
        scheduled: { 
          type: "boolean",
          description: "Enable scheduling (requires scheduledCron)" 
        },
        scheduledCron: { 
          type: "string",
          pattern: PATTERNS.cron,
          description: "Valid Unix cron expression (required if scheduled=true)" 
        },
        notifyEmailTo: {
          type: "string",
          pattern: PATTERNS.email,
          description: "Valid email address for notifications"
        },
        verbosity: { 
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log level: 1=Error, 2=Info, 3=Transfer, 4=Verbose" 
        },
        truncateTableData: {
          type: "boolean",
          description: "WARNING: Deletes all destination data before sync"
        },
        dropTable: {
          type: "boolean",
          description: "WARNING: Drops and recreates destination tables"
        },
        type: {
          type: "number",
          enum: [1, 2, 3, 7, 10],
          description: "Job type: 1=Standard, 2=Sync All, 3=Load Folder, 7=CDC, 10=Reverse ETL"
        },
        queries: {
          type: "array",
          items: { 
            type: "string",
            minLength: 10,
            description: "SQL query - must be valid SQL, not placeholder"
          },
          minItems: 1,
          description: "SQL queries for tasks. Use REPLICATE [TableName] or valid SQL."
        },
        requireExplicitValues: {
          type: "boolean",
          default: true,
          description: "When true, reject placeholder values for critical parameters"
        }
      },
      required: ["action", "jobName"],
      additionalProperties: false,
      if: {
        properties: { action: { const: "create" } }
      },
      then: {
        required: ["action", "jobName", "source", "destination"]
      }
    },
  },
];

export const strictUserTools: Tool[] = [
  {
    name: "write_users",
    description: "Create or update users. CRITICAL: Passwords must be secure. Roles must be exact values. No placeholder users allowed.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["create", "update"],
          description: "Operation to perform" 
        },
        user: { 
          type: "string",
          pattern: PATTERNS.username,
          description: "Username (required). 3-50 chars, alphanumeric/underscore/hyphen only." 
        },
        password: { 
          type: "string",
          minLength: 8,
          pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
          description: "Password (required for create). Min 8 chars, must include uppercase, lowercase, and number." 
        },
        roles: { 
          type: "string",
          enum: ["cdata_admin", "cdata_standard", "cdata_job_creator", "cdata_support"],
          description: "User role (required). Must be exact value." 
        },
        active: { 
          type: "boolean",
          description: "Enable/disable user access" 
        },
        federationId: { 
          type: "string",
          description: "SSO federation ID (optional)" 
        },
        expiredIn: { 
          type: "number",
          minimum: 1,
          maximum: 365,
          description: "Token expiry in days (1-365)" 
        },
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              user: { 
                type: "string",
                pattern: PATTERNS.username,
                description: "Username" 
              },
              password: { 
                type: "string",
                minLength: 8,
                pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
                description: "Secure password" 
              },
              roles: { 
                type: "string",
                enum: ["cdata_admin", "cdata_standard", "cdata_job_creator", "cdata_support"],
                description: "User role" 
              },
              active: { type: "boolean" },
              federationId: { type: "string" },
            },
            required: ["user", "password", "roles"],
            additionalProperties: false
          },
          minItems: 1,
          maxItems: 50,
          description: "Array of users for bulk creation (1-50 users)"
        },
        requireSecurePasswords: {
          type: "boolean",
          default: true,
          description: "When true, enforce password complexity requirements"
        }
      },
      required: ["action"],
      additionalProperties: false,
      if: {
        properties: { action: { const: "create" } }
      },
      then: {
        oneOf: [
          { required: ["action", "user", "password", "roles"] },
          { required: ["action", "users"] }
        ]
      }
    },
  },
];

// Configuration tool with safety measures
export const strictConfigTools: Tool[] = [
  {
    name: "configure_sync_server",
    description: "Configure MCP server connection to CData Sync. CRITICAL: Changes take effect immediately. Test configuration before applying.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "update"],
          default: "get",
          description: "Get current config or update (required)"
        },
        baseUrl: {
          type: "string",
          pattern: "^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$",
          description: "Valid HTTP/HTTPS URL for CData Sync API"
        },
        authToken: {
          type: "string",
          minLength: 10,
          description: "API auth token (min 10 chars). Do not use placeholder tokens."
        },
        username: {
          type: "string",
          pattern: PATTERNS.username,
          description: "Username for basic auth"
        },
        password: {
          type: "string",
          minLength: 8,
          description: "Password for basic auth (min 8 chars)"
        },
        clearAuth: {
          type: "boolean",
          description: "WARNING: Clears all authentication"
        },
        requireValidUrl: {
          type: "boolean",
          default: true,
          description: "When true, validate URL format and reachability"
        }
      },
      required: ["action"],
      additionalProperties: false
    }
  }
];

// Export function that includes safety mode parameter
export const getStrictTools = (safeMode: boolean = true): Tool[] => {
  if (!safeMode) {
    console.warn("WARNING: Running in non-safe mode. Placeholder values may be accepted.");
  }
  
  return [
    ...strictConfigTools,
    ...strictConnectionTools,
    ...strictJobTools,
    // ... include other strict tool arrays
    ...strictUserTools,
  ];
};