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
    description: "Configure the MCP server's connection to CData Sync. Use 'get' to view current configuration including auth type and connection status, or 'update' to modify connection settings. CRITICAL: Configuration changes take effect immediately and will reconnect all services. Test new credentials before applying. Cannot be used to view passwords or auth tokens for security reasons.",
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
          pattern: "^https?://[\\w\\.-]+(:\\d+)?(/.*)?$",
          description: "Base URL for CData Sync API endpoint (e.g., 'http://localhost:8181/api.rsc'). Must be a valid HTTP/HTTPS URL. If path doesn't end with '/api.rsc', it will be appended automatically. Changes require reconnection."
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
          description: "Password for basic authentication (minimum 8 characters). Required when using username. Credentials are validated by attempting a connection. Store securely - do not commit to version control."
        },
        authToken: {
          type: "string",
          minLength: 10,
          description: "API authentication token for CData Sync. Minimum 10 characters. Takes precedence over basic auth if both are provided. Token will be validated by attempting a connection. Existing token is cleared when switching to basic auth."
        },
        clearAuth: {
          type: "boolean",
          description: "Remove all authentication credentials. WARNING: This will disconnect the MCP server from CData Sync. You must provide new credentials to restore functionality."
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
    description: "Access data source/destination connections that define how CData Sync connects to databases, APIs, and files. Use 'list' to see all available connections, 'get' to retrieve details about a specific connection, 'test' to verify credentials and connectivity. Connections must be created and tested before being used in jobs. Multiple jobs can use the same connection simultaneously. Note: For counting connections, use 'list' and count the results client-side.",
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
          description: "OData filter expression. Note: Some complex filters may not be supported. Use simple expressions like \"contains(Name,'value')\" for best results."
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
        }
      }
    }
  },
  {
    name: "write_connections",
    description: "Create, update, or delete data connections. Connections define how to access your data sources (databases, APIs, files) and destinations. Connection strings are provider-specific - consult CData documentation for your provider. Cannot modify or delete connections currently in use by running jobs. To change providers, delete and recreate the connection.",
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
    description: "Access and monitor data replication jobs that move data from source to destination. Jobs contain tasks defining what data to replicate. Use 'list' to see all jobs, 'get' for configuration details, 'status' to check current execution state, 'history' for past runs, or 'logs' for detailed execution logs. Note: Count action not supported by API - use 'list' and count results client-side. Jobs can run on-demand or on schedules using cron expressions.",
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
          description: "OData filter expression. Note: Some complex filters may not work. Use simple expressions like \"Status eq 'Running'\" for best results."
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
        }
      }
    }
  },
  {
    name: "write_jobs",
    description: "Create, modify, or delete data replication jobs. Jobs orchestrate moving data from source to destination with options for scheduling, transformations, error handling, and notifications. IMPORTANT: Use table names exactly as reported by the source connection - do not modify names or extensions. Job types: 1=Standard replication, 2=Sync All tables, 3=Load Folder, 7=Change Data Capture, 10=Reverse ETL. Cannot modify/delete running jobs. Add tasks after creating the job.",
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
        }
      },
      required: ["action", "jobName"]
    }
  },
  {
    name: "execute_job",
    description: "Run a job immediately, bypassing its schedule. Executes all tasks in sequence (or parallel if configured). Use waitForResults=true to wait for completion and see results, or false to start asynchronously. Running jobs cannot be modified or deleted until complete.",
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
        }
      }
    }
  },
  {
    name: "cancel_job",
    description: "Stop a currently running job. Cancellation may take time as current task completes. Partial data may remain in destination. Use job history to see what was processed before cancellation.",
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
        }
      }
    }
  }
];

// Enhanced Task Tools (with clarified JobName requirement and removed count that works)
export const taskTools: Tool[] = [
  {
    name: "read_tasks",
    description: "Access tasks within a specific job. Each task defines specific data to replicate - either a table or custom query. Tasks execute sequentially by index order (or in parallel if job configured). IMPORTANT: All actions require a jobName parameter. Use 'get' to see all tasks in a job. Tasks have unique TaskIds (large numbers - handle as strings).",
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
          description: "OData filter expression. Note: Complex filters may not be supported."
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
        }
      },
      required: ["jobName"]
    }
  },
  {
    name: "write_tasks",
    description: "Manage tasks within jobs. IMPORTANT: Tasks cannot be directly updated - to modify, delete then recreate. Use 'create' to add 'REPLICATE [TableName]' for full table copy using exact source table names, or custom SQL queries with filters/joins. Tasks execute by index order. Delete removes specific task. TaskIds are large numbers - always handle as strings to prevent precision loss.",
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
        table: {
          type: "string",
          description: "Simple table name to replicate (alternative to query). Use exact name as reported by source connection. Automatically creates REPLICATE query."
        },
        query: {
          type: "string",
          description: "SQL query for the task. Use 'REPLICATE [TableName]' for full table using exact source names, or write custom SQL with filters/joins"
        },
        index: {
          type: "string",
          pattern: "^[1-9]\\d{0,3}$",
          description: "Execution order (1, 2, 3...). Tasks run sequentially by index unless parallel processing enabled."
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
    description: "Execute pre-defined queries within a job context for testing or ad-hoc data operations. IMPORTANT: Can only execute queries that are already defined as tasks in the job - cannot run arbitrary SQL. Queries run in the job's source/destination connections. Use for testing existing job tasks or triggering specific job queries. Respects job settings like timeout and error handling.",
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
        }
      },
      required: ["queries"]
    }
  },
  {
    name: "get_connection_tables",
    description: "Discover available tables/views in a data source. Essential first step before creating jobs - shows what data is available to replicate. Use the exact table names returned by this function when creating REPLICATE tasks. Check both source and destination to ensure compatibility.",
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
        }
      },
      required: ["connectionName"]
    }
  },
  {
    name: "get_table_columns",
    description: "Get column details for a specific table including names, data types, and key information. Use exact table name as reported by get_connection_tables. Essential for understanding table structure before writing queries, verifying schema compatibility, or planning data transformations.",
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
        }
      },
      required: ["connectionName", "table"]
    }
  },
  {
    name: "get_job_tables",
    description: "List tables available to add to a specific job, considering job configuration and connection capabilities. Similar to get_connection_tables but filtered for job compatibility. Use when expanding job scope or adding new tables to existing job. Returns exact table names to use in tasks.",
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
    description: "Access CData Sync user accounts and their permissions. Users can have roles: cdata_admin (full access), cdata_standard (run jobs), cdata_job_creator (create/modify jobs), cdata_support (operate jobs). Use 'list' to see all users, 'get' for specific user details, or 'count' for total active users.",
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
          description: "OData filter (e.g., \"Active eq 'true'\" or \"Roles eq 'cdata_admin'\")"
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
        }
      }
    }
  },
  {
    name: "write_users",
    description: "Create or update CData Sync users. Roles: cdata_admin (full admin), cdata_standard (run jobs), cdata_job_creator (create/edit jobs), cdata_support (operate jobs). Single or bulk creation supported. Users execute jobs with their permissions. Federation ID enables SSO. Cannot delete users via API.",
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
          description: "User password (required for create). Store securely."
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
                description: "Password"
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
    description: "Access job execution history to analyze performance, troubleshoot failures, and audit data movements. Each history record shows when a job ran, its status, duration, and records affected. Use 'list' to browse history with filters/sorting. Note: Count action not supported by API - use 'list' and count results client-side. Essential for monitoring job health and SLA compliance.",
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
        }
      }
    }
  },
  {
    name: "read_requests",
    description: "Access API request logs for auditing, debugging, and compliance. Shows all API calls made to CData Sync including user, timestamp, endpoint, and response status. Use to track configuration changes, monitor API usage, or troubleshoot integration issues. Logs retained based on system settings.",
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
          description: "OData filter (e.g., \"User eq 'admin' and Status ne '200'\" or \"Method eq 'DELETE'\")"
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
        }
      }
    }
  },
  {
    name: "write_requests",
    description: "Delete API request log entries. Use for privacy compliance, log cleanup, or removing sensitive data. Only deletes log entries - does not undo the original operations. Requires appropriate permissions.",
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
    description: "Access data transformations that run SQL in the destination after job completion (ELT pattern). Transformations clean, aggregate, or reshape data using the destination's processing power. Use 'list' to see all transformations, 'get' for details, or 'count' for total. Can run on schedule or trigger after specific jobs succeed.",
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
          description: "OData filter (e.g., \"Connection eq 'DataWarehouse'\" or \"TransformationTriggerMode eq 'AfterJob'\")"
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
        }
      }
    }
  },
  {
    name: "write_transformations",
    description: "Create, update, or delete SQL transformations for ELT processing. Transformations run SQL queries in the destination database to clean, aggregate, or reshape data after loading. Can run on cron schedules or automatically after specific jobs succeed. Use different connection than job if needed (e.g., read from staging, write to analytics schema).",
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
          description: "Unix cron expression for scheduled execution (e.g., '0 6 * * *' for 6 AM daily)"
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
    description: "List SSL/TLS certificates used for secure connections. Certificates enable encrypted communication with HTTPS endpoints, APIs requiring client certificates, or secured database connections. Shows certificate details including expiration dates for compliance monitoring.",
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
          description: "OData filter (e.g., \"ExpirationDays lt 30\" to find expiring certificates)"
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
        }
      }
    }
  },
  {
    name: "write_certificates",
    description: "Upload SSL/TLS certificates for secure connections. Required for HTTPS sources, client certificate authentication, or encrypted database connections. Certificates must be base64-encoded. Monitor expiration dates to prevent connection failures.",
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
    ...certificateTools
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