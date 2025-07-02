/**
 * Enhanced CData Sync MCP Server Tool Definitions
 * Production-ready definitions with validation and realistic expectations
 * Based on comprehensive testing results and real-world usage patterns
 */

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// Enhanced Configuration Tools
export const configurationTools: Tool[] = [
  {
    name: "configure_sync_server",
    description: "Configure the MCP server's connection to CData Sync. If not authenticated, you will be prompted for credentials. Use 'get' to view current configuration including auth type, connection status, and workspace context, or 'update' to modify connection settings including the default workspace. CRITICAL: Configuration changes take effect immediately and will reconnect all services. Test new credentials before applying. Cannot be used to view passwords or auth tokens for security reasons. The workspace setting determines which workspace context is used for all operations unless overridden in individual tool calls.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "update"],
          default: "get",
          description: "Operation to perform. Use 'get' to view current configuration, 'update' to modify settings."
        },
        baseUrl: {
          type: "string",
          pattern: "^(https?://[\\w\\.-]+(:\\d+)?(/.*)?)?$",
          description: "Base URL for CData Sync API endpoint (e.g., 'http://localhost:8181/api.rsc'). Can be empty to clear the URL. When provided, must be a valid HTTP/HTTPS URL. If path doesn't end with '/api.rsc', it will be appended automatically. Changes require reconnection."
        },
        username: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Username for basic authentication. Used together with password when authToken is not provided. Must be an existing active user in CData Sync with appropriate permissions."
        },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 128,
          description: "Password must be 8+ characters with uppercase, lowercase, numbers, AND special characters (!@#$%^&*). Example: 'MyPass123@'. Required when using username. Store securely - do not commit to version control."
        },
        authToken: {
          type: "string",
          minLength: 10,
          description: "API authentication token for CData Sync. Minimum 10 characters. Takes precedence over basic auth if both are provided. Token will be validated by attempting a connection. Existing token is cleared when switching to basic auth."
        },
        clearAuth: {
          type: "boolean",
          description: "Remove all authentication credentials. WARNING: This will disconnect the MCP server from CData Sync. You must provide new credentials to restore functionality."
        },
        workspace: {
          type: "string",
          description: "Workspace ID for all operations. Use 'default' for the default workspace, or provide a workspace UUID (e.g., '60d9c6e1-6583-4ff1-b44e-11b2d1964f16'). This sets the workspace context for all subsequent operations unless overridden. You can find workspace IDs using the read_workspaces tool."
        }
      },
      required: ["action"]
    }
  }
];

// Enhanced Connection Tools
export const connectionTools: Tool[] = [
  {
    name: "read_connections",
    description: "Access data source/destination connections that define how CData Sync connects to databases, APIs, and files. If not authenticated with CData Sync, you will be prompted for credentials. Use 'list' to see all available connections, 'get' to retrieve details about a specific connection, 'test' to verify credentials and connectivity. Connections must be created and tested before being used in jobs. Multiple jobs can use the same connection simultaneously. Note: For counting connections, use 'list' and count the results client-side.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "test"],
          default: "list",
          description: "Operation to perform. Use 'list' to see all connections, 'get' for specific connection details, 'test' to verify connectivity. For counts, use 'list' and count results."
        },
        name: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Connection name (required for 'get' and 'test' actions). Case-sensitive."
        },
        providerName: {
          type: "string",
          description: "Provider name for 'test' action (optional - uses existing if not specified)"
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
LIMITED SUPPORT: contains(), startswith()
NOT SUPPORTED: nested queries, computed properties
Example: "ProviderName eq 'CData Salesforce' and ConnectionState eq 'Successful'"`
        },
        select: {
          type: "string",
          description: "Comma-separated properties to include in results (e.g., 'Name,ProviderName,ConnectionState')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum number of results to return (for pagination)"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Number of results to skip (for pagination)"
        },
        verbosity: {
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log detail level for 'test' action: 1=Error, 2=Info, 3=Transfer, 4=Verbose"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_connections",
    description: "Create, update, or delete data connections. If not authenticated with CData Sync, you will be prompted for credentials. Connections define how to access your data sources (databases, APIs, files) and destinations. Connection strings are provider-specific - consult CData documentation for your provider. Cannot modify or delete connections currently in use by running jobs. To change providers, delete and recreate the connection.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "delete"],
          description: "Operation to perform. Create new connections, update existing (connection string only), or delete unused connections"
        },
        name: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Connection name. Use descriptive names like 'Prod_Salesforce' or 'Dev_MySQL'. Case-sensitive."
        },
        providerName: {
          type: "string",
          description: "ADO.NET provider for 'create' (e.g., 'CData Salesforce', 'System.Data.SqlClient'). Cannot be changed after creation."
        },
        connectionString: {
          type: "string",
          description: "Provider-specific connection parameters. Format varies by provider. May contain credentials - handle securely."
        },
        verbosity: {
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Default log level for this connection: 1=Error, 2=Info (default), 3=Transfer, 4=Verbose"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "name"]
    }
  }
];

// Enhanced Job Tools (with removed non-functional count action)
export const jobTools: Tool[] = [
  {
    name: "read_jobs",
    description: `Access and monitor data replication jobs that move data from source to destination.

RETURNS:
- list: Array of job objects with name, status, and configuration
- get: Full job configuration details
- status: Current execution state and progress
- history: Past execution records
- logs: Detailed execution logs for debugging

COMMON ERRORS:
- "Job not found" - Verify job name/ID
- "No logs available" - Check log retention settings
- "Access denied" - Verify user permissions`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "status", "history", "logs"],
          default: "list",
          description: "Operation: list all, get config, check status, view history, or download logs. For counts, use 'list' and count results client-side."
        },
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Job name (required for get/status/logs). Use descriptive names like 'Daily_Sales_Sync'. Case-sensitive."
        },
        jobId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Alternative to jobName - use the UUID job identifier for status/logs"
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
LIMITED SUPPORT: contains(), startswith()
NOT SUPPORTED: nested queries, computed properties
Example: "Status eq 'Running' and Source eq 'MySQL'"`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'JobName,Status,Source,Destination')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results to return"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip for pagination"
        },
        orderby: {
          type: "string",
          description: "Sort order for history (e.g., 'RunStartDate desc')"
        },
        days: {
          type: "number",
          minimum: 1,
          maximum: 365,
          description: "Number of days of logs to retrieve (default: 1, max depends on retention)"
        },
        pushOnQuery: {
          type: "boolean",
          description: "Include detailed query status (default: true)"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_jobs",
    description: "Create, modify, or delete data replication jobs. If not authenticated with CData Sync, you will be prompted for credentials. Jobs orchestrate moving data from source to destination with options for scheduling, transformations, error handling, and notifications. IMPORTANT: Use table names exactly as reported by the source connection - do not modify names or extensions. Job types: 1=Standard replication, 2=Sync All tables, 3=Load Folder, 7=Change Data Capture, 10=Reverse ETL. Cannot modify/delete running jobs. Add tasks after creating the job.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "delete"],
          description: "Operation to perform. Create new jobs, update settings, or delete stopped jobs"
        },
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Unique job name. Use descriptive names indicating purpose/frequency (e.g., 'Hourly_Customer_Sync')"
        },
        source: {
          type: "string",
          description: "Source connection name (required for create). Must be an existing, tested connection."
        },
        destination: {
          type: "string",
          description: "Destination connection name (required for create). Must be an existing, tested connection."
        },
        type: {
          type: "number",
          enum: [1, 2, 3, 7, 10],
          description: "Job type: 1=Standard, 2=Sync All tables, 3=Load Folder, 7=CDC (if supported), 10=Reverse ETL"
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "SQL queries for tasks. Use 'REPLICATE [TableName]' for full table copy using exact source table names, or write custom SQL with filters/joins. Table names must match exactly what the source reports."
        },
        scheduled: {
          type: "boolean",
          description: "Enable scheduled execution. When true, also set scheduledCron."
        },
        scheduledCron: {
          type: "string",
          pattern: "^([0-5]?\\d|\\*)\\s+([01]?\\d|2[0-3]|\\*)\\s+([0-2]?\\d|3[01]|\\*)\\s+([0]?\\d|1[0-2]|\\*)\\s+([0-6]|\\*)$",
          description: "Unix cron expression for scheduling (e.g., '0 */2 * * *' for every 2 hours). Runs as job creator."
        },
        verbosity: {
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log detail level: 1=Error only, 2=Info (default), 3=Transfer details, 4=Verbose/Debug"
        },
        batchSize: {
          type: "string",
          pattern: "^[1-9]\\d{0,6}$",
          description: "Records per batch. Larger = faster but more memory. Provider-specific optimal values."
        },
        commandTimeout: {
          type: "string",
          pattern: "^[1-9]\\d{0,4}$",
          description: "Seconds before query timeout. Increase for long-running operations."
        },
        continueOnError: {
          type: "boolean",
          description: "Continue processing remaining tasks if one fails. Useful for independent tables."
        },
        dropTable: {
          type: "boolean",
          description: "Drop and recreate destination table each run. Handles schema changes but loses indexes/constraints."
        },
        truncateTableData: {
          type: "boolean",
          description: "Delete all destination rows before each sync (full refresh). Slower but ensures consistency."
        },
        alterSchema: {
          type: "boolean",
          description: "Automatically add columns and modify data types when source schema changes"
        },
        autoTruncateStrings: {
          type: "boolean",
          description: "Automatically truncate strings exceeding destination column size instead of failing"
        },
        skipDeleted: {
          type: "boolean",
          description: "Ignore deleted records in source (if supported). Improves performance but may leave orphaned data."
        },
        useGmtDateTime: {
          type: "boolean",
          description: "Use GMT/UTC for all timestamps instead of local server time"
        },
        tableNamePrefix: {
          type: "string",
          maxLength: 20,
          pattern: "^[a-zA-Z][a-zA-Z0-9_]*$",
          description: "Prefix for all destination tables (e.g., 'staging_' creates 'staging_customers')"
        },
        cacheSchema: {
          type: "string",
          maxLength: 50,
          description: "Override destination schema name (e.g., 'analytics' instead of default 'dbo')"
        },
        replicateStartDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Start replicating from this date (yyyy-MM-dd). Useful for historical data limits."
        },
        replicateInterval: {
          type: "string",
          pattern: "^[1-9]\\d{0,4}$",
          description: "Chunk size for data replication (e.g., '30' with 'days' = 30-day chunks). Improves resume capability."
        },
        replicateIntervalUnit: {
          type: "string",
          enum: ["minutes", "hours", "days", "weeks", "months", "years"],
          description: "Unit for replication interval: minutes, hours, days (default), weeks, months, years"
        },
        sendEmailNotification: {
          type: "boolean",
          description: "Send email after job completion. Requires email configuration."
        },
        emailErrorOnly: {
          type: "boolean",
          description: "Only send email on job failure (reduces notification noise)"
        },
        notifyEmailTo: {
          type: "string",
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+(\\s*,\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+)*$",
          description: "Email recipient(s) for notifications. Comma-separate multiple addresses."
        },
        notifyEmailSubject: {
          type: "string",
          maxLength: 200,
          description: "Custom email subject. Can include job name/status variables."
        },
        notifyWindowsEvent: {
          type: "boolean",
          description: "Write errors to Windows Event Log (Windows servers only)"
        },
        preJob: {
          type: "string",
          description: "SQL/code to execute before job starts. Use for setup/validation."
        },
        postJob: {
          type: "string",
          description: "SQL/code to execute after job completes. Use for cleanup/notifications."
        },
        otherCacheOptions: {
          type: "string",
          description: "Additional provider-specific options (comma-separated key=value pairs)"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "jobName"]
    }
  },
  {
    name: "execute_job",
    description: "Run a job immediately, bypassing its schedule. If not authenticated with CData Sync, you will be prompted for credentials. Executes all tasks in sequence (or parallel if configured). Use waitForResults=true to wait for completion and see results, or false to start asynchronously. Running jobs cannot be modified or deleted until complete.",
    inputSchema: {
      type: "object",
      properties: {
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Name of the job to execute"
        },
        jobId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Alternative: UUID of the job to execute"
        },
        waitForResults: {
          type: "boolean",
          default: true,
          description: "Wait for job completion (default: true). False returns immediately."
        },
        timeout: {
          type: "number",
          minimum: 0,
          maximum: 86400,
          default: 0,
          description: "Maximum seconds to wait for completion (0 = no timeout)"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "cancel_job",
    description: `Stop a currently running job.

RETURNS:
- Success: Confirmation of cancellation request
- Error: { code: -32603, message: "error details" }

COMMON ERRORS:
- "Job not running" - Job may have already completed
- "Job not found" - Verify job name/ID
- "Cancellation failed" - Job may be in uncancellable state`,
    inputSchema: {
      type: "object",
      properties: {
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Name of the running job to cancel"
        },
        jobId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Alternative: UUID of the running job to cancel"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  }
];

// Enhanced Task Tools (with clarified JobName requirement and removed count that works)
export const taskTools: Tool[] = [
  {
    name: "read_tasks",
    description: `Access tasks within a specific job. Each task defines specific data to replicate.

REQUIRED: jobName parameter for all actions.

RETURNS:
- get: Array of task objects with TaskId, Query, Table, and Index

COMMON ERRORS:
- "Job not found" - Verify job name with read_jobs
- "No tasks defined" - Job may be empty, add tasks with write_tasks`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get"],
          default: "get",
          description: "Operation: 'get' shows all tasks for the job. For counts, count the returned results client-side."
        },
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Job name containing the tasks (REQUIRED for all actions). Case-sensitive."
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
LIMITED SUPPORT: contains(), startswith()
NOT SUPPORTED: nested queries, computed properties`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'TaskId,Table,Query,Index')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results to return"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip for pagination"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["jobName"]
    }
  },
  {
    name: "write_tasks",
    description: `Manage tasks within jobs. Tasks define what data to replicate.

IMPORTANT: Use exact table names from get_connection_tables, including file extensions.

RETURNS:
- create: New task with assigned TaskId
- update: Creates new task (cannot modify existing)
- delete: Confirmation of task removal

COMMON ERRORS:
- "Invalid table name" - Use exact name from get_connection_tables
- "Task not found" - Verify TaskId with read_tasks
- "Invalid query syntax" - Check SQL syntax for provider`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "delete"],
          description: "Operation: create new, update (actually creates new!), or delete existing task"
        },
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Job name containing the task (required). Job must exist."
        },
        taskId: {
          type: "string",
          pattern: "^\\d+$",
          description: "Task ID as string for update/delete. Use exact value from read_tasks - don't convert numbers."
        },
        tableName: {
          type: "string",
          description: "Exact table name as returned by get_connection_tables. Include file extensions for file-based sources (e.g., 'Account.csv' not 'Account'). Case-sensitive. Automatically creates REPLICATE query."
        },
        query: {
          type: "string",
          description: "SQL query for the task. Use 'REPLICATE [TableName]' for full table using exact source names, or write custom SQL with filters/joins"
        },
        index: {
          type: "string",
          pattern: "^[1-9]\\d{0,3}$",
          description: "Execution order (1, 2, 3...). Tasks run sequentially by index unless parallel processing enabled."
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "jobName"]
    }
  }
];

// Enhanced Query and Discovery Tools
export const queryTools: Tool[] = [
  {
    name: "execute_query",
    description: `Execute pre-defined queries within a job context for testing or ad-hoc operations.

IMPORTANT: Can only execute queries already defined as tasks - cannot run arbitrary SQL.

RETURNS:
- Success: Query execution results with row counts and timing
- Async: Confirmation that queries started
- Error: { code: -32603, message: "error details" }

COMMON ERRORS:
- "Query not found" - Query must exist as task in job
- "Job not found" - Verify job name/ID
- "Execution failed" - Check query syntax and connections`,
    inputSchema: {
      type: "object",
      properties: {
        jobName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Job context for query execution (defines connections to use)"
        },
        jobId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Alternative: Job UUID for context"
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Query names or REPLICATE statements that exist as tasks in the job. Cannot execute arbitrary SQL - must match existing task patterns."
        },
        waitForResults: {
          type: "boolean",
          default: true,
          description: "Wait for completion (true) or run async (false)"
        },
        timeout: {
          type: "number",
          minimum: 0,
          maximum: 86400,
          default: 0,
          description: "Maximum seconds to wait (0 = unlimited)"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["queries"]
    }
  },
  {
    name: "get_connection_tables",
    description: `Discover available tables/views in a data source. Essential before creating jobs.

RETURNS: Array of table names in exact format needed for tasks.

COMMON ERRORS:
- "Connection not found" - Verify connection name
- "Access denied" - Check connection permissions
- "No tables found" - Verify schema/catalog settings`,
    inputSchema: {
      type: "object",
      properties: {
        connectionName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Connection to inspect. Must be created and tested first."
        },
        schema: {
          type: "string",
          maxLength: 50,
          description: "Specific schema to query (e.g., 'dbo', 'public'). Omit for all schemas."
        },
        tableOrView: {
          type: "string",
          enum: ["TABLES", "VIEWS", "ALL"],
          default: "ALL",
          description: "Filter by type: 'TABLES', 'VIEWS', or 'ALL'"
        },
        includeSchema: {
          type: "boolean",
          description: "Include schema in names (e.g., 'dbo.Table')"
        },
        includeCatalog: {
          type: "boolean",
          description: "Include catalog in names (e.g., 'MyDB.dbo.Table')"
        },
        topTable: {
          type: "number",
          minimum: 1,
          maximum: 5000,
          default: 5000,
          description: "Maximum tables to return (default: 5000)"
        },
        skipTable: {
          type: "number",
          minimum: 0,
          description: "Tables to skip for pagination"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["connectionName"]
    }
  },
  {
    name: "get_table_columns",
    description: `Get column details for a specific table including names, data types, and keys.

RETURNS: Array of column objects with name, type, nullable, and key information.

COMMON ERRORS:
- "Table not found" - Use exact name from get_connection_tables
- "Connection not found" - Verify connection name
- "Access denied" - Check table permissions`,
    inputSchema: {
      type: "object",
      properties: {
        connectionName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Connection containing the table"
        },
        table: {
          type: "string",
          description: "Table name using exact name from get_connection_tables (include schema if needed, e.g., 'dbo.Customers')"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["connectionName", "table"]
    }
  },
  {
    name: "get_job_tables",
    description: "List tables available to add to a specific job, considering job configuration and connection capabilities. If not authenticated with CData Sync, you will be prompted for credentials. Similar to get_connection_tables but filtered for job compatibility. Use when expanding job scope or adding new tables to existing job. Returns exact table names to use in tasks.",
    inputSchema: {
      type: "object",
      properties: {
        connectionName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Source connection to query. Must match the job's source connection."
        },
        jobId: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Target job UUID to add tables to (required). Use read_jobs to get the JobId."
        },
        schema: {
          type: "string",
          maxLength: 50,
          description: "Specific schema to query"
        },
        tableOrView: {
          type: "string",
          enum: ["TABLES", "VIEWS", "ALL"],
          default: "ALL",
          description: "Filter: 'TABLES', 'VIEWS', or 'ALL'"
        },
        includeSchema: {
          type: "boolean",
          description: "Include schema in table names"
        },
        includeCatalog: {
          type: "boolean",
          description: "Include catalog in table names"
        },
        topTable: {
          type: "number",
          minimum: 1,
          maximum: 5000,
          default: 5000,
          description: "Maximum results"
        },
        skipTable: {
          type: "number",
          minimum: 0,
          description: "Skip for pagination"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["connectionName", "jobId"]
    }
  }
];

// Enhanced User Management Tools
export const userTools: Tool[] = [
  {
    name: "read_users",
    description: `Access CData Sync user accounts and their permissions.

ROLES:
- cdata_admin: Full administrative access
- cdata_standard: Run existing jobs
- cdata_job_creator: Create and modify jobs
- cdata_support: Operate jobs (start/stop)

RETURNS:
- list: Array of user objects
- get: Detailed user information
- count: Total number of users

COMMON ERRORS:
- "User not found" - Check username spelling
- "Access denied" - Admin role required`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "count", "get"],
          default: "list",
          description: "Operation to perform"
        },
        user: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.@]{0,49}$",
          description: "Username for 'get' action. Case-sensitive."
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
Example: "Active eq 'true' and Roles eq 'cdata_admin'"`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'User,Roles,Active')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_users",
    description: `Create or update CData Sync users.

PASSWORD REQUIREMENTS: Must contain uppercase, lowercase, numbers, AND special characters.

RETURNS:
- create: New user details with confirmation
- update: Updated user information

COMMON ERRORS:
- "Invalid password" - Must meet complexity requirements
- "User already exists" - Use unique usernames
- "Invalid role" - Use exact role values (cdata_admin, etc.)
- "Bulk creation failed" - Check individual user errors`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update"],
          description: "Create new users or update existing. No delete available."
        },
        user: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.@]{0,49}$",
          description: "Username for single operations. Must be unique. Case-sensitive."
        },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 128,
          description: "Password must be 8+ characters with uppercase, lowercase, numbers, AND special characters (!@#$%^&*). Example: 'MyPass123@'. Required for create. Store securely."
        },
        roles: {
          type: "string",
          enum: ["cdata_admin", "cdata_standard", "cdata_job_creator", "cdata_support"],
          description: "User role (use exact values): cdata_admin, cdata_standard, cdata_job_creator, or cdata_support"
        },
        active: {
          type: "boolean",
          description: "Enable/disable user access. Inactive users cannot log in."
        },
        federationId: {
          type: "string",
          maxLength: 100,
          description: "SSO federation ID. Enables single sign-on authentication."
        },
        expiredIn: {
          type: "number",
          minimum: 1,
          maximum: 3650,
          description: "Days until auth token expires (update only). Useful for API access tokens."
        },
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              user: {
                type: "string",
                pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.@]{0,49}$",
                description: "Username"
              },
              password: {
                type: "string",
                minLength: 8,
                maxLength: 128,
                description: "Password must contain uppercase, lowercase, numbers, AND special characters"
              },
              roles: {
                type: "string",
                enum: ["cdata_admin", "cdata_standard", "cdata_job_creator", "cdata_support"],
                description: "User role (exact values required)"
              },
              active: {
                type: "boolean",
                description: "Active status (default: true)"
              },
              federationId: {
                type: "string",
                maxLength: 100,
                description: "SSO federation ID"
              }
            },
            required: ["user", "password"]
          },
          description: "Array of users for bulk creation. Efficient for adding multiple users at once."
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action"]
    }
  }
];

// Enhanced Monitoring Tools (with removed non-functional count actions)
export const historyTools: Tool[] = [
  {
    name: "read_history",
    description: "Access job execution history to analyze performance, troubleshoot failures, and audit data movements. If not authenticated with CData Sync, you will be prompted for credentials. Each history record shows when a job ran, its status, duration, and records affected. Use 'list' to browse history with filters/sorting. Note: Count action not supported by API - use 'list' and count results client-side. Essential for monitoring job health and SLA compliance.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list"],
          default: "list",
          description: "List history records. For counts, use 'list' with 'top' parameter and count results client-side."
        },
        filter: {
          type: "string",
          description: "OData filter. Note: Complex filters may not work. Use simple expressions like \"JobName eq 'Daily_Sync'\" for best results."
        },
        orderby: {
          type: "string",
          description: "Sort order (e.g., 'RunStartDate desc' for most recent first)"
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'JobName,RunStartDate,Status,Runtime,RecordsAffected')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum records to return (useful for recent history and counting)"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Records to skip for pagination"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "read_requests",
    description: `Access API request logs for auditing, debugging, and compliance.

RETURNS:
- list: Array of request log entries
- count: Total number of requests
- get: Detailed request information

COMMON ERRORS:
- "Request not found" - Check request ID
- "Logs purged" - Older logs may be deleted per retention policy`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "count", "get"],
          default: "list",
          description: "List logs, count total, or get specific request details"
        },
        id: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Request ID for 'get' action (UUID format)"
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
Example: "User eq 'admin' and Status ne '200'"`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'Timestamp,User,URL,Method,Status')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results (recent requests first)"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_requests",
    description: `Delete API request log entries for privacy compliance or cleanup.

RETURNS: Confirmation of log entry deletion.

COMMON ERRORS:
- "Request not found" - Verify request ID
- "Access denied" - Admin permissions required
- "Cannot delete" - Some logs may be protected`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["delete"],
          description: "Delete specific request log entry"
        },
        id: {
          type: "string",
          pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
          description: "Request ID to delete (UUID format)"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "id"]
    }
  }
];

// Enhanced Transformation Tools
export const transformationTools: Tool[] = [
  {
    name: "read_transformations",
    description: `Access data transformations that run SQL in the destination (ELT pattern).

RETURNS:
- list: Array of transformation objects
- get: Detailed transformation configuration
- count: Total number of transformations

COMMON ERRORS:
- "Transformation not found" - Check name spelling
- "Access denied" - Verify permissions`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "count", "get"],
          default: "list",
          description: "Operation to perform"
        },
        transformationName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Transformation name for 'get' action. Case-sensitive."
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
Example: "Connection eq 'DataWarehouse' or TransformationTriggerMode eq 'AfterJob'"`
        },
        select: {
          type: "string",
          description: "Properties to include"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_transformations",
    description: `Create, update, or delete SQL transformations for ELT processing.

RETURNS:
- create: New transformation details
- update: Updated configuration
- delete: Confirmation of removal

COMMON ERRORS:
- "Invalid SQL syntax" - Check destination SQL dialect
- "Connection not found" - Verify destination connection
- "Trigger job not found" - Check job name for AfterJob mode`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "delete"],
          description: "Operation to perform"
        },
        transformationName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Unique transformation name. Use descriptive names like 'Daily_Sales_Aggregation'"
        },
        connection: {
          type: "string",
          description: "Destination connection where SQL will execute (required for create). Can differ from job destinations."
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "SQL queries to execute. Run in order. Can include DDL, DML, stored procedures. Use destination SQL dialect."
        },
        transformationTriggerMode: {
          type: "string",
          enum: ["None", "Scheduled", "AfterJob"],
          description: "When to run: 'None' (manual only), 'Scheduled' (use cron), 'AfterJob' (after job success)"
        },
        scheduledCron: {
          type: "string",
          pattern: "^([0-5]?\\d|\\*)\\s+([01]?\\d|2[0-3]|\\*)\\s+([0-2]?\\d|3[01]|\\*)\\s+([0]?\\d|1[0-2]|\\*)\\s+([0-6]|\\*)$",
          description: `Unix cron format (minute hour day month weekday)
Examples:
- "0 6 * * *" - 6 AM daily
- "30 */4 * * *" - Every 4 hours at :30
- "0 0 * * 1" - Midnight every Monday`
        },
        triggerAfterJob: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Job name that triggers this transformation (when mode is 'AfterJob'). Job must succeed."
        },
        triggerTasks: {
          type: "string",
          pattern: "^\\d+(,\\d+)*$",
          description: "Comma-separated task IDs to wait for (optional - waits for entire job if not specified)"
        },
        verbosity: {
          type: "string",
          enum: ["1", "2", "3", "4"],
          description: "Log level: 1=Error, 2=Info, 3=Transfer, 4=Verbose"
        },
        sendEmailNotification: {
          type: "boolean",
          description: "Send email after transformation completes"
        },
        emailErrorOnly: {
          type: "boolean",
          description: "Only send email on transformation failure"
        },
        notifyEmailTo: {
          type: "string",
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+(\\s*,\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+)*$",
          description: "Email recipient(s) for notifications"
        },
        notifyEmailSubject: {
          type: "string",
          maxLength: 200,
          description: "Email subject line"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "transformationName"]
    }
  }
];

// Enhanced Certificate Tools
export const certificateTools: Tool[] = [
  {
    name: "read_certificates",
    description: `List SSL/TLS certificates used for secure connections.

RETURNS: Array of certificate objects with name, subject, expiration, and thumbprint.

COMMON ERRORS:
- "No certificates found" - None uploaded yet
- "Access denied" - Certificate access may be restricted`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list"],
          default: "list",
          description: "List all certificates (only action available)"
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
Example: "ExpirationDays lt 30" to find expiring certificates`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'Name,Subject,ExpirationDate,Thumbprint')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      }
    }
  },
  {
    name: "write_certificates",
    description: `Upload SSL/TLS certificates for secure connections.

RETURNS: Certificate details with confirmation of upload.

COMMON ERRORS:
- "Invalid certificate format" - Must be base64-encoded
- "Certificate expired" - Check expiration date
- "Duplicate certificate" - Certificate already exists
- "Invalid store type" - Check provider documentation`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create"],
          description: "Create/upload new certificate (only action available)"
        },
        name: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Certificate identifier. Use descriptive names like 'api_client_cert_2024'"
        },
        data: {
          type: "string",
          pattern: "^[A-Za-z0-9+/]+=*$",
          description: "Base64-encoded certificate data (.cer, .pfx, .p12 formats)"
        },
        storeType: {
          type: "string",
          description: "Certificate store type (provider-specific, e.g., 'CurrentUser', 'LocalMachine')"
        },
        workspaceId: {
          type: "string",
          description: "Workspace ID to use for this operation. Overrides the default workspace. Use 'default' for the default workspace or a UUID for specific workspaces."
        }
      },
      required: ["action", "name"]
    }
  }
];

// Workspace Tools
export const workspaceTools: Tool[] = [
  {
    name: "read_workspaces",
    description: `Access CData Sync workspaces for multi-tenant organization.

WORKSPACES:
- Organize jobs, connections, and transformations
- Isolate resources between teams/projects
- Support multi-tenant deployments

RETURNS:
- list: Array of workspace objects with Id and Name
- get: Detailed workspace information
- count: Total number of workspaces

COMMON ERRORS:
- "Workspace not found" - Check workspace name spelling
- "Access denied" - Requires appropriate permissions`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "count", "get"],
          default: "list",
          description: "Operation to perform"
        },
        name: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Workspace name for 'get' action. Case-sensitive. Either 'name' or 'id' is required for get action."
        },
        id: {
          type: "string",
          description: "Workspace ID (UUID) for 'get' action. Alternative to 'name' parameter. More efficient when you know the workspace ID."
        },
        filter: {
          type: "string",
          description: `OData filter expression.
SUPPORTED: eq, ne, gt, lt, ge, le, and, or
Example: "Name eq 'Production'"`
        },
        select: {
          type: "string",
          description: "Properties to include (e.g., 'Id,Name')"
        },
        top: {
          type: "number",
          minimum: 1,
          maximum: 1000,
          description: "Maximum results"
        },
        skip: {
          type: "number",
          minimum: 0,
          description: "Results to skip"
        }
      }
    }
  },
  {
    name: "write_workspaces",
    description: `Create, update, or delete CData Sync workspaces.

WORKSPACE NAMES:
- Must be unique across the system
- Cannot contain special characters except _ - .
- Case-sensitive

RETURNS:
- create: New workspace details
- update: Updated workspace information
- delete: Success confirmation

COMMON ERRORS:
- "Workspace already exists" - Use unique names
- "Workspace in use" - Cannot delete workspace with active resources
- "Invalid name" - Check naming requirements`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "delete"],
          description: "Operation to perform"
        },
        name: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "Workspace name. Required for create action, optional for update/delete if 'id' is provided."
        },
        id: {
          type: "string",
          description: "Workspace ID (UUID). Can be used instead of 'name' for update and delete actions. More efficient when you know the workspace ID."
        },
        newName: {
          type: "string",
          pattern: "^[a-zA-Z0-9_][a-zA-Z0-9_\\-\\.]{0,49}$",
          description: "New name for 'update' action"
        }
      },
      required: ["action", "name"]
    }
  }
];

// Aggregate all tools
export function getAllTools(): Tool[] {
  return [
    ...configurationTools,
    ...connectionTools,
    ...jobTools,
    ...taskTools,
    ...queryTools,
    ...userTools,
    ...historyTools,
    ...transformationTools,
    ...certificateTools,
    ...workspaceTools
  ];
}

// Export tool usage guidelines for documentation
export const toolUsageGuidelines = {
  tableNames: "Always use exact table names as reported by get_connection_tables. Do not modify names or file extensions.",
  filtering: "Use simple OData filter expressions for best compatibility. Complex filters may not be supported by all endpoints.",
  taskIds: "Handle TaskIds as strings to prevent precision loss with large numbers.",
  jobNames: "Use descriptive, unique names following the pattern: Purpose_Frequency_Target (e.g., 'Daily_Sales_Sync')",
  cronExpressions: "Use standard Unix cron format. Test expressions before deployment.",
  validation: "All tools include input validation patterns. Invalid inputs will be rejected with clear error messages.",
  errorHandling: "Tools provide specific error messages for troubleshooting. Check logs for detailed execution information.",
  counting: "For counting records/resources, use 'list' actions with appropriate 'top' limits and count results client-side. Several count endpoints are not supported by the CData Sync API."
};