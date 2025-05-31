// src/tools/toolDefinitions.ts - Enhanced with detailed descriptions
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const connectionTools: Tool[] = [
  {
    name: "read_connections",
    description: "Access data source/destination connections that define how CData Sync connects to databases, APIs, and files. Use 'list' to see all available connections, 'get' to retrieve details about a specific connection, 'test' to verify credentials and connectivity, or 'count' to get the total number. Connections must be created and tested before being used in jobs. Multiple jobs can use the same connection simultaneously.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count", "get", "test"],
          default: "list",
          description: "Operation to perform. Use 'list' to see all connections, 'get' for specific connection details, 'test' to verify connectivity, 'count' for total number" 
        },
        name: { 
          type: "string", 
          description: "Connection name (required for 'get' and 'test' actions). Case-sensitive." 
        },
        filter: { 
          type: "string", 
          description: "OData filter for 'list'/'count' (e.g., \"contains(Name,'prod')\" or \"ProviderName eq 'CData Salesforce'\")" 
        },
        select: { 
          type: "string", 
          description: "Comma-separated properties to include in results (e.g., 'Name,ProviderName,ConnectionState')" 
        },
        top: { 
          type: "number", 
          description: "Maximum number of results to return (for pagination)" 
        },
        skip: { 
          type: "number", 
          description: "Number of results to skip (for pagination)" 
        },
        providerName: { 
          type: "string", 
          description: "Provider name for 'test' action (optional - uses existing if not specified)" 
        },
        verbosity: { 
          type: "string", 
          description: "Log detail level for 'test' action: 1=Error, 2=Info, 3=Transfer, 4=Verbose" 
        },
      },
    },
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
          description: "Default log level for this connection: 1=Error, 2=Info (default), 3=Transfer, 4=Verbose" 
        },
      },
      required: ["action", "name"],
    },
  },
];

export const jobTools: Tool[] = [
  {
    name: "read_jobs",
    description: "Access and monitor data replication jobs that move data from source to destination. Jobs contain tasks defining what data to replicate. Use 'list' to see all jobs, 'get' for configuration details, 'status' to check current execution state, 'history' for past runs, 'logs' for detailed execution logs, or 'count' for totals. Jobs can run on-demand or on schedules using cron expressions.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count", "get", "status", "history", "logs"],
          default: "list",
          description: "Operation: list all, count total, get config, check status, view history, or download logs" 
        },
        jobName: { 
          type: "string", 
          description: "Job name (required for get/status/logs). Use descriptive names like 'Daily_Sales_Sync'. Case-sensitive." 
        },
        jobId: { 
          type: "string", 
          description: "Alternative to jobName - use the UUID job identifier for status/logs" 
        },
        filter: { 
          type: "string", 
          description: "OData filter (e.g., \"Status eq 'Running'\" or \"contains(JobName,'Sales')\")" 
        },
        select: { 
          type: "string", 
          description: "Properties to include (e.g., 'JobName,Status,Source,Destination')" 
        },
        top: { 
          type: "number", 
          description: "Maximum results to return" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip for pagination" 
        },
        orderby: { 
          type: "string", 
          description: "Sort order for history (e.g., 'RunStartDate desc')" 
        },
        pushOnQuery: { 
          type: "boolean", 
          description: "Include detailed query status (default: true)" 
        },
        days: { 
          type: "number", 
          description: "Number of days of logs to retrieve (default: 1, max depends on retention)" 
        },
      },
    },
  },
  {
    name: "write_jobs",
    description: "Create, modify, or delete data replication jobs. Jobs orchestrate moving data from source to destination with options for scheduling, transformations, error handling, and notifications. Job types: 1=Standard replication, 2=Sync All tables, 3=Load Folder, 7=Change Data Capture, 10=Reverse ETL. Cannot modify/delete running jobs. Add tasks after creating the job.",
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
        // Scheduling Parameters
        scheduled: { 
          type: "boolean", 
          description: "Enable scheduled execution. When true, also set scheduledCron." 
        },
        scheduledCron: { 
          type: "string", 
          description: "Unix cron expression for scheduling (e.g., '0 */2 * * *' for every 2 hours). Runs as job creator." 
        },
        // Notification Parameters
        notifyWindowsEvent: {
          type: "boolean",
          description: "Write errors to Windows Event Log (Windows servers only)"
        },
        sendEmailNotification: {
          type: "boolean", 
          description: "Send email after job completion. Requires email configuration."
        },
        notifyEmailTo: {
          type: "string",
          description: "Email recipient(s) for notifications. Comma-separate multiple addresses."
        },
        notifyEmailSubject: {
          type: "string",
          description: "Custom email subject. Can include job name/status variables."
        },
        emailErrorOnly: {
          type: "boolean",
          description: "Only send email on job failure (reduces notification noise)"
        },
        // Job Behavior Parameters
        verbosity: { 
          type: "string", 
          description: "Log detail level: 1=Error only, 2=Info (default), 3=Transfer details, 4=Verbose/Debug" 
        },
        tableNamePrefix: {
          type: "string",
          description: "Prefix for all destination tables (e.g., 'staging_' creates 'staging_customers')"
        },
        useGmtDateTime: {
          type: "boolean",
          description: "Use GMT/UTC for all timestamps instead of local server time"
        },
        truncateTableData: {
          type: "boolean", 
          description: "Delete all destination rows before each sync (full refresh). Slower but ensures consistency."
        },
        dropTable: {
          type: "boolean",
          description: "Drop and recreate destination table each run. Handles schema changes but loses indexes/constraints."
        },
        autoTruncateStrings: {
          type: "boolean",
          description: "Automatically truncate strings exceeding destination column size instead of failing"
        },
        continueOnError: {
          type: "boolean",
          description: "Continue processing remaining tasks if one fails. Useful for independent tables."
        },
        alterSchema: {
          type: "boolean",
          description: "Automatically add columns and modify data types when source schema changes"
        },
        // Replication Parameters
        replicateInterval: {
          type: "string",
          description: "Chunk size for data replication (e.g., '30' with 'days' = 30-day chunks). Improves resume capability."
        },
        replicateIntervalUnit: {
          type: "string", 
          description: "Unit for replication interval: minutes, hours, days (default), weeks, months, years"
        },
        replicateStartDate: {
          type: "string",
          description: "Start replicating from this date (yyyy-MM-dd). Useful for historical data limits."
        },
        // Performance Parameters
        batchSize: {
          type: "string",
          description: "Records per batch. Larger = faster but more memory. Provider-specific optimal values."
        },
        commandTimeout: {
          type: "string",
          description: "Seconds before query timeout. Increase for long-running operations."
        },
        skipDeleted: {
          type: "boolean",
          description: "Ignore deleted records in source (if supported). Improves performance but may leave orphaned data."
        },
        // Advanced Parameters
        otherCacheOptions: {
          type: "string",
          description: "Additional provider-specific options (comma-separated key=value pairs)"
        },
        cacheSchema: {
          type: "string", 
          description: "Override destination schema name (e.g., 'analytics' instead of default 'dbo')"
        },
        preJob: {
          type: "string",
          description: "SQL/code to execute before job starts. Use for setup/validation."
        },
        postJob: {
          type: "string",
          description: "SQL/code to execute after job completes. Use for cleanup/notifications."
        },
        type: {
          type: "number",
          description: "Job type: 1=Standard, 2=Sync All tables, 3=Load Folder, 7=CDC (if supported), 10=Reverse ETL"
        },
        // Query Parameters
        queries: {
          type: "array",
          items: { type: "string" },
          description: "SQL queries for tasks. Use REPLICATE [TableName] for full table copy or write custom SQL. Added as tasks."
        },
      },
      required: ["action", "jobName"],
    },
  },
  {
    name: "execute_job",
    description: "Run a job immediately, bypassing its schedule. Executes all tasks in sequence (or parallel if configured). Use waitForResults=true to wait for completion and see results, or false to start asynchronously. Running jobs cannot be modified or deleted until complete.",
    inputSchema: {
      type: "object",
      properties: {
        jobName: { type: "string", description: "Name of the job to execute" },
        jobId: { type: "string", description: "Alternative: UUID of the job to execute" },
        waitForResults: { type: "boolean", description: "Wait for job completion (default: true). False returns immediately.", default: true },
        timeout: { type: "number", description: "Maximum seconds to wait for completion (0 = no timeout)", default: 0 },
      },
    },
  },
  {
    name: "cancel_job",
    description: "Stop a currently running job. Cancellation may take time as current task completes. Partial data may remain in destination. Use job history to see what was processed before cancellation.",
    inputSchema: {
      type: "object",
      properties: {
        jobName: { type: "string", description: "Name of the running job to cancel" },
        jobId: { type: "string", description: "Alternative: UUID of the running job to cancel" },
      },
    },
  },
];

export const taskTools: Tool[] = [
  {
    name: "read_tasks",
    description: "Access tasks within a job. Each task defines specific data to replicate - either a table or custom query. Tasks execute sequentially by index order (or in parallel if job configured). Use 'list' to see all tasks in a job, 'get' for job task details, or 'count' for total. Tasks have unique TaskIds (large numbers - handle as strings).",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count", "get"],
          default: "list",
          description: "Operation to perform on tasks" 
        },
        jobName: { 
          type: "string", 
          description: "Job name containing the tasks (required for 'get'). Case-sensitive." 
        },
        filter: { 
          type: "string", 
          description: "OData filter (e.g., \"Table eq 'Customers'\" or \"contains(Query,'SELECT')\")" 
        },
        select: { 
          type: "string", 
          description: "Properties to include (e.g., 'TaskId,Table,Query,Index')" 
        },
        top: { 
          type: "number", 
          description: "Maximum results to return" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip for pagination" 
        },
      },
    },
  },
  {
    name: "write_tasks",
    description: "Manage tasks within jobs. IMPORTANT: Tasks cannot be directly updated - to modify, delete then recreate. Use 'create' to add REPLICATE [TableName] for full table copy or custom SQL queries with filters/joins. Tasks execute by index order. Delete removes specific task. TaskIds are large numbers - always handle as strings to prevent precision loss.",
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
          description: "Job name containing the task (required). Job must exist." 
        },
        taskId: {
          type: "string",
          description: "Task ID as string for update/delete. Use exact value from read_tasks - don't convert numbers."
        },
        query: { 
          type: "string", 
          description: "SQL query for the task. Use 'REPLICATE [TableName]' for full table or write custom SQL with filters/joins" 
        },
        table: { 
          type: "string", 
          description: "Simple table name to replicate (alternative to query). Automatically creates REPLICATE query." 
        },
        index: { 
          type: "string", 
          description: "Execution order (1, 2, 3...). Tasks run sequentially by index unless parallel processing enabled." 
        },
      },
      required: ["action", "jobName"],
    },
  },
];

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
          description: "Maximum results" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip" 
        },
      },
    },
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
          description: "Unique transformation name. Use descriptive names like 'Daily_Sales_Aggregation'" 
        },
        connection: { 
          type: "string", 
          description: "Destination connection where SQL will execute (required for create). Can differ from job destinations." 
        },
        // Trigger parameters
        transformationTriggerMode: { 
          type: "string", 
          description: "When to run: 'None' (manual only), 'Scheduled' (use cron), 'AfterJob' (after job success)",
          enum: ["None", "Scheduled", "AfterJob"]
        },
        triggerAfterJob: {
          type: "string",
          description: "Job name that triggers this transformation (when mode is 'AfterJob'). Job must succeed."
        },
        triggerTasks: {
          type: "string", 
          description: "Comma-separated task IDs to wait for (optional - waits for entire job if not specified)"
        },
        scheduledCron: {
          type: "string",
          description: "Unix cron expression for scheduled execution (e.g., '0 6 * * *' for 6 AM daily)"
        },
        // Notification parameters
        sendEmailNotification: {
          type: "boolean",
          description: "Send email after transformation completes"
        },
        notifyEmailTo: {
          type: "string",
          description: "Email recipient(s) for notifications"
        },
        notifyEmailSubject: {
          type: "string", 
          description: "Email subject line"
        },
        emailErrorOnly: {
          type: "boolean",
          description: "Only send email on transformation failure"
        },
        // Other parameters
        verbosity: { 
          type: "string", 
          description: "Log level: 1=Error, 2=Info, 3=Transfer, 4=Verbose" 
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "SQL queries to execute. Run in order. Can include DDL, DML, stored procedures. Use destination SQL dialect."
        },
      },
      required: ["action", "transformationName"],
    },
  },
];

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
          description: "Maximum results" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip" 
        },
      },
    },
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
        // For single user creation/update
        user: { 
          type: "string", 
          description: "Username for single operations. Must be unique. Case-sensitive." 
        },
        password: { 
          type: "string", 
          description: "User password (required for create). Store securely." 
        },
        roles: { 
          type: "string", 
          description: "User role (use exact values): cdata_admin, cdata_standard, cdata_job_creator, or cdata_support" 
        },
        active: { 
          type: "boolean", 
          description: "Enable/disable user access. Inactive users cannot log in." 
        },
        federationId: { 
          type: "string", 
          description: "SSO federation ID. Enables single sign-on authentication." 
        },
        expiredIn: { 
          type: "number", 
          description: "Days until auth token expires (update only). Useful for API access tokens." 
        },
        // For multiple user creation
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              user: { type: "string", description: "Username" },
              password: { type: "string", description: "Password" },
              roles: { type: "string", description: "User role (exact values required)" },
              active: { type: "boolean", description: "Active status (default: true)" },
              federationId: { type: "string", description: "SSO federation ID" },
            },
            required: ["user", "password"],
          },
          description: "Array of users for bulk creation. Efficient for adding multiple users at once."
        },
      },
      required: ["action"],
    },
  },
];

export const historyTools: Tool[] = [
  {
    name: "read_history",
    description: "Access job execution history to analyze performance, troubleshoot failures, and audit data movements. Each history record shows when a job ran, its status, duration, and records affected. Use 'list' to browse history with filters/sorting, or 'count' for statistics. Essential for monitoring job health and SLA compliance.",
    inputSchema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["list", "count"],
          default: "list",
          description: "List history records or count total matching criteria" 
        },
        filter: { 
          type: "string", 
          description: "OData filter (e.g., \"JobName eq 'Daily_Sync' and Status eq 'Failed'\" or \"RunStartDate gt 2024-01-01\")" 
        },
        select: { 
          type: "string", 
          description: "Properties to include (e.g., 'JobName,RunStartDate,Status,Runtime,RecordsAffected')" 
        },
        top: { 
          type: "number", 
          description: "Maximum records to return (useful for recent history)" 
        },
        skip: { 
          type: "number", 
          description: "Records to skip for pagination" 
        },
        orderby: { 
          type: "string", 
          description: "Sort order (e.g., 'RunStartDate desc' for most recent first)" 
        },
      },
    },
  },
];

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
          description: "Maximum results" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip" 
        },
      },
    },
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
          description: "Certificate identifier. Use descriptive names like 'api_client_cert_2024'" 
        },
        data: { 
          type: "string", 
          description: "Base64-encoded certificate data (.cer, .pfx, .p12 formats)" 
        },
        storeType: { 
          type: "string", 
          description: "Certificate store type (provider-specific, e.g., 'CurrentUser', 'LocalMachine')" 
        },
      },
      required: ["action", "name"],
    },
  },
];

export const requestTools: Tool[] = [
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
          description: "Maximum results (recent requests first)" 
        },
        skip: { 
          type: "number", 
          description: "Results to skip" 
        },
      },
    },
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
          description: "Request ID to delete (UUID format)" 
        },
      },
      required: ["action", "id"],
    },
  },
];

export const queryTools: Tool[] = [
  {
    name: "execute_query",
    description: "Execute SQL queries within a job context for testing or ad-hoc data operations. Queries run in the job's source/destination connections. Use for testing REPLICATE commands, validating custom SQL, or one-off data operations. Respects job settings like timeout and error handling.",
    inputSchema: {
      type: "object",
      properties: {
        jobName: { type: "string", description: "Job context for query execution (defines connections to use)" },
        jobId: { type: "string", description: "Alternative: Job UUID for context" },
        queries: { 
          type: "array", 
          items: { type: "string" },
          description: "SQL queries to execute. Use 'REPLICATE [Table]' for full copy or custom SQL. Executes in order." 
        },
        waitForResults: { type: "boolean", description: "Wait for completion (true) or run async (false)", default: true },
        timeout: { type: "number", description: "Maximum seconds to wait (0 = unlimited)", default: 0 },
      },
      required: ["queries"],
    },
  },
  {
    name: "get_connection_tables",
    description: "Discover available tables/views in a data source. Essential first step before creating jobs - shows what data is available to replicate. Use filters to find specific schemas or table types. Check both source and destination to ensure compatibility.",
    inputSchema: {
      type: "object",
      properties: {
        connectionName: { type: "string", description: "Connection to inspect. Must be created and tested first." },
        tableOrView: { type: "string", description: "Filter by type: 'TABLES', 'VIEWS', or 'ALL'", default: "ALL" },
        schema: { type: "string", description: "Specific schema to query (e.g., 'dbo', 'public'). Omit for all schemas." },
        includeCatalog: { type: "boolean", description: "Include catalog in names (e.g., 'MyDB.dbo.Table')" },
        includeSchema: { type: "boolean", description: "Include schema in names (e.g., 'dbo.Table')" },
        topTable: { type: "number", description: "Maximum tables to return (default: 5000)", default: 5000 },
        skipTable: { type: "number", description: "Tables to skip for pagination" },
      },
      required: ["connectionName"],
    },
  },
  {
    name: "get_table_columns",
    description: "Get column details for a specific table including names, data types, and key information. Use to understand table structure before writing queries, verify schema compatibility, or plan data transformations. Essential for custom SQL queries with specific columns.",
    inputSchema: {
      type: "object",
      properties: {
        connectionName: { type: "string", description: "Connection containing the table" },
        table: { type: "string", description: "Table name (include schema if needed, e.g., 'dbo.Customers')" },
      },
      required: ["connectionName", "table"],
    },
  },
  {
    name: "get_job_tables",
    description: "List tables available to add to a specific job, considering job configuration and connection capabilities. Similar to get_connection_tables but filtered for job compatibility. Use when expanding job scope or adding new tables to existing job. Note: JobId is required when using this tool to identify which job you're adding tables to.",
    inputSchema: {
      type: "object",
      properties: {
        connectionName: { type: "string", description: "Source connection to query. Must match the job's source connection." },
        jobId: { type: "string", description: "Target job UUID to add tables to (required). Use read_jobs to get the JobId." },
        tableOrView: { type: "string", description: "Filter: 'TABLES', 'VIEWS', or 'ALL'", default: "ALL" },
        schema: { type: "string", description: "Specific schema to query" },
        includeCatalog: { type: "boolean", description: "Include catalog in table names" },
        includeSchema: { type: "boolean", description: "Include schema in table names" },
        topTable: { type: "number", description: "Maximum results", default: 5000 },
        skipTable: { type: "number", description: "Skip for pagination" },
      },
      required: ["connectionName", "jobId"],  // Added jobId to required fields
    },
  },
];

export const configTools: Tool[] = [
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
          description: "Base URL for CData Sync API endpoint (e.g., 'http://localhost:8181/api.rsc'). Must be a valid HTTP/HTTPS URL. If path doesn't end with '/api.rsc', it will be appended automatically. Changes require reconnection."
        },
        authToken: {
          type: "string",
          description: "API authentication token for CData Sync. Minimum 10 characters. Takes precedence over basic auth if both are provided. Token will be validated by attempting a connection. Existing token is cleared when switching to basic auth."
        },
        username: {
          type: "string",
          description: "Username for basic authentication. Used together with password when authToken is not provided. Must be an existing active user in CData Sync with appropriate permissions."
        },
        password: {
          type: "string",
          description: "Password for basic authentication (minimum 8 characters). Required when using username. Credentials are validated by attempting a connection. Store securely - do not commit to version control."
        },
        clearAuth: {
          type: "boolean",
          description: "Remove all authentication credentials. WARNING: This will disconnect the MCP server from CData Sync. You must provide new credentials to restore functionality."
        }
      },
      required: ["action"],
    },
  },
];

// Combine all tools
export const getAllTools = (): Tool[] => [
  ...configTools,
  ...connectionTools,
  ...jobTools,
  ...taskTools,
  ...transformationTools,
  ...userTools,
  ...requestTools,
  ...historyTools,
  ...certificateTools,
  ...queryTools,
];