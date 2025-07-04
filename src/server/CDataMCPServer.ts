// src/server/CDataMCPServer.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { StreamableHttpTransport } from "../transport/StreamableHttpTransport.js";
import { CDataConfig } from "../types/config.js";
import { CDataSyncApiClient } from "../api/CDataSyncApiClient.js";
import { ConnectionService } from "../services/ConnectionService.js";
import { JobService } from "../services/JobService.js";
import { TaskService } from "../services/TaskService.js";
import { TransformationService } from "../services/TransformationService.js";
import { RequestService } from "../services/RequestService.js";
import { UserService } from "../services/UserService.js";
import { HistoryService } from "../services/HistoryService.js";
import { CertificateService } from "../services/CertificateService.js";
import { WorkspaceService } from "../services/WorkspaceService.js";
import { SyncConfigService } from "../services/SyncConfigService.js";
import { SSEServer } from "../sse/SSEServer.js";
import { getAllTools } from "../tools/toolDefinitions.js";
import { validateRequiredParameters } from "../services/RequiredParameterValidation.js";
import { 
  ToolParamMap, ToolResultMap,
  ConnectionReadParams, ConnectionWriteParams,
  JobReadParams, JobWriteParams,
  TaskReadParams, TaskWriteParams,
  TransformationReadParams, TransformationWriteParams,
  UserReadParams, UserWriteParams,
  RequestReadParams, RequestWriteParams,
  HistoryReadParams, CertificateReadParams, CertificateWriteParams,
  WorkspaceReadParams, WorkspaceWriteParams,
  ConfigParams,
  isConnectionReadAction, isConnectionWriteAction,
  isJobReadAction, isJobWriteAction,
  isTaskReadAction, isTaskWriteAction,
  isTransformationReadAction, isTransformationWriteAction,
  isUserReadAction, isUserWriteAction,
  isRequestReadAction, isRequestWriteAction,
  isHistoryReadAction, isCertificateReadAction, isCertificateWriteAction,
  isWorkspaceReadAction, isWorkspaceWriteAction,
  isConfigAction
} from "../types/tools.js";
import { assertDefined } from "../utils/typeGuards.js";
import { toIdString } from "../utils/typeConverters.js";

export class CDataMCPServer {
  private server: Server;
  private syncClient: CDataSyncApiClient;
  private syncConfigService: SyncConfigService;
  private connectionService: ConnectionService;
  private jobService: JobService;
  private taskService: TaskService;
  private transformationService: TransformationService;
  private requestService: RequestService;
  private userService: UserService;
  private historyService: HistoryService;
  private certificateService: CertificateService;
  private workspaceService: WorkspaceService;
  private sseServer?: SSEServer;
  private httpTransport?: StreamableHttpTransport;
  private stdioTransport?: StdioServerTransport;
  private useStderr: boolean;

  constructor(config: CDataConfig, useStderr: boolean = true) {
    this.useStderr = useStderr;
    this.syncClient = new CDataSyncApiClient(config);
    
    // Set up credential prompt handler
    this.syncClient.setCredentialPromptHandler(async () => {
      // Return a prompt request that the MCP client will handle
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Authentication required. Please provide CData Sync credentials using the configure_sync_server tool with either authToken or username/password."
      );
    });
    
    // Initialize all services
    this.connectionService = new ConnectionService(this.syncClient);
    this.jobService = new JobService(this.syncClient);
    this.taskService = new TaskService(this.syncClient);
    this.transformationService = new TransformationService(this.syncClient);
    this.requestService = new RequestService(this.syncClient);
    this.userService = new UserService(this.syncClient);
    this.historyService = new HistoryService(this.syncClient);
    this.certificateService = new CertificateService(this.syncClient);
    this.workspaceService = new WorkspaceService(this.syncClient);
    
    // Create config service with callback to update all services and workspace validation
    this.syncConfigService = new SyncConfigService(
      config, 
      (newConfig) => this.handleConfigChange(newConfig),
      (workspaceId) => this.validateWorkspace(workspaceId)
    );

    this.server = new Server(
      {
        name: "cdata-sync-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupMCPHandlers();
  }

  private log(message: string): void {
    if (this.useStderr) {
      console.error(`[MCP Server] ${message}`);
    } else {
      console.log(`[MCP Server] ${message}`);
    }
  }

  private handleConfigChange(newConfig: CDataConfig): void {
    // Create new API client with new config
    this.syncClient = new CDataSyncApiClient(newConfig);
    
    // Re-set credential prompt handler
    this.syncClient.setCredentialPromptHandler(async () => {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Authentication required. Please provide CData Sync credentials using the configure_sync_server tool with either authToken or username/password."
      );
    });
    
    // Recreate all services with new client
    this.connectionService = new ConnectionService(this.syncClient);
    this.jobService = new JobService(this.syncClient);
    this.taskService = new TaskService(this.syncClient);
    this.transformationService = new TransformationService(this.syncClient);
    this.requestService = new RequestService(this.syncClient);
    this.userService = new UserService(this.syncClient);
    this.historyService = new HistoryService(this.syncClient);
    this.certificateService = new CertificateService(this.syncClient);
    this.workspaceService = new WorkspaceService(this.syncClient);
    
    // Broadcast configuration change event if SSE server is running
    if (this.sseServer) {
      this.sseServer.broadcastEvent("config_changed", {
        timestamp: new Date().toISOString(),
        baseUrl: newConfig.baseUrl,
        authType: newConfig.authToken ? 'token' : 'basic'
      });
    }
    
    this.log(`CData Sync connection reconfigured: ${newConfig.baseUrl}`);
  }

  // Helper method to validate workspace exists
  private async validateWorkspace(workspaceId: string): Promise<void> {
    try {
      // Try to get the workspace to validate it exists
      await this.workspaceService.getWorkspaceById(workspaceId);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Workspace with ID '${workspaceId}' not found. Use read_workspaces tool to list available workspaces.`);
      }
      // Re-throw other errors (like auth failures)
      throw error;
    }
  }

  // Helper method to execute operations with workspace override
  private async withWorkspaceOverride<T>(
    workspaceId: string | undefined,
    operation: () => Promise<T>
  ): Promise<T> {
    if (workspaceId) {
      // Validate workspace exists before using it
      await this.validateWorkspace(workspaceId);
      
      // Use the BaseService workspace override pattern
      const originalWorkspace = this.syncClient.getWorkspace();
      try {
        this.syncClient.setWorkspace(workspaceId);
        if (process.env.DEBUG_WORKSPACE) {
          console.error(`[Workspace Override] Switching from '${originalWorkspace}' to '${workspaceId}'`);
        }
        return await operation();
      } finally {
        this.syncClient.setWorkspace(originalWorkspace);
        if (process.env.DEBUG_WORKSPACE) {
          console.error(`[Workspace Override] Restored to '${originalWorkspace}'`);
        }
      }
    } else {
      // No workspace override, use current workspace
      if (process.env.DEBUG_WORKSPACE) {
        console.error(`[Workspace Override] Using current workspace: '${this.syncClient.getWorkspace()}'`);
      }
      return await operation();
    }
  }

  private setupMCPHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getAllTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Validate required parameters before executing
        const validation = this.validateToolParameters(name, args || {});
        if (!validation.valid) {
          throw new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`);
        }

        const result = await this.handleToolCall(name as keyof ToolParamMap, args || {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        // Enhanced error reporting
        let errorMessage = `Tool execution failed: ${error.message}`;
        
        // Add more context for common errors
        if (error.response?.status === 400) {
          errorMessage += ` (Bad Request - check parameter format)`;
        } else if (error.response?.status === 404) {
          errorMessage += ` (Not Found - resource doesn't exist)`;
        } else if (error.response?.status === 401) {
          errorMessage += ` (Unauthorized - check authentication)`;
        }
        
        // Include API error details if available
        if (error.response?.data?.error?.message) {
          errorMessage += ` - API Error: ${error.response.data.error.message}`;
        }
        
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
  }

  private validateToolParameters(toolName: string, args: any): { valid: boolean; missingParams: string[] } {
    const action = args.action || 'execute';
    
    // Only validate write operations and execution commands
    if (toolName.startsWith('write_') || toolName.startsWith('execute_') || toolName === 'configure_sync_server') {
      return validateRequiredParameters(toolName, action, args);
    }
    
    // Read operations typically don't have strict requirements
    return { valid: true, missingParams: [] };
  }

  private async handleToolCall<T extends keyof ToolParamMap>(
    toolName: T,
    args: any
  ): Promise<ToolResultMap[T]> {
    // Broadcast event if SSE server is running
    if (this.sseServer) {
      this.sseServer.broadcastEvent("tool_execution", {
        tool: toolName,
        args,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const result = await this.executeToolMethod(toolName, args);
      
      if (this.sseServer) {
        this.sseServer.broadcastEvent("tool_success", {
          tool: toolName,
          timestamp: new Date().toISOString(),
        });
      }

      return result as ToolResultMap[T];
    } catch (error: any) {
      if (this.sseServer) {
        this.sseServer.broadcastEvent("tool_error", {
          tool: toolName,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  private async executeToolMethod(toolName: keyof ToolParamMap, args: any): Promise<any> {

    // Configuration Management
    if (toolName === "configure_sync_server") {
      return this.handleConfigOperation(args as ConfigParams);
    }

    // Connection Management
    if (toolName === "read_connections") {
      return this.handleConnectionRead(args as ConnectionReadParams);
    }
    if (toolName === "write_connections") {
      return this.handleConnectionWrite(args as ConnectionWriteParams);
    }

    // Job Management
    if (toolName === "read_jobs") {
      return this.handleJobRead(args as JobReadParams);
    }
    if (toolName === "write_jobs") {
      return this.handleJobWrite(args as JobWriteParams);
    }
    if (toolName === "execute_job") {
      // Ensure jobId is string if provided
      if (args.jobId !== undefined) {
        args.jobId = toIdString(args.jobId);
      }
      const result = await this.withWorkspaceOverride(args.workspaceId, async () => {
        return this.jobService.executeJob(args);
      });
      if (this.sseServer) {
        this.sseServer.broadcastEvent("job_executed", {
          jobName: args.jobName || args.jobId,
          result,
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    }
    if (toolName === "cancel_job") {
      // Ensure jobId is string if provided
      if (args.jobId !== undefined) {
        args.jobId = toIdString(args.jobId);
      }
      const result = await this.withWorkspaceOverride(args.workspaceId, async () => {
        return this.jobService.cancelJob(args);
      });
      if (this.sseServer) {
        this.sseServer.broadcastEvent("job_cancelled", {
          jobName: args.jobName || args.jobId,
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    }

    // Task Management
    if (toolName === "read_tasks") {
      return this.handleTaskRead(args as TaskReadParams);
    }
    if (toolName === "write_tasks") {
      return this.handleTaskWrite(args as TaskWriteParams);
    }

    // Transformation Management
    if (toolName === "read_transformations") {
      return this.handleTransformationRead(args as TransformationReadParams);
    }
    if (toolName === "write_transformations") {
      return this.handleTransformationWrite(args as TransformationWriteParams);
    }

    // User Management
    if (toolName === "read_users") {
      return this.handleUserRead(args as UserReadParams);
    }
    if (toolName === "write_users") {
      return this.handleUserWrite(args as UserWriteParams);
    }

    // Request Management
    if (toolName === "read_requests") {
      return this.handleRequestRead(args as RequestReadParams);
    }
    if (toolName === "write_requests") {
      return this.handleRequestWrite(args as RequestWriteParams);
    }

    // History Management
    if (toolName === "read_history") {
      return this.handleHistoryRead(args as HistoryReadParams);
    }

    // Certificate Management
    if (toolName === "read_certificates") {
      return this.handleCertificateRead(args as CertificateReadParams);
    }
    if (toolName === "write_certificates") {
      return this.handleCertificateWrite(args as CertificateWriteParams);
    }

    // Workspace Management
    if (toolName === "read_workspaces") {
      return this.handleWorkspaceRead(args as WorkspaceReadParams);
    }
    if (toolName === "write_workspaces") {
      return this.handleWorkspaceWrite(args as WorkspaceWriteParams);
    }

    // Query and Schema Tools
    if (toolName === "execute_query") {
      const result = await this.jobService.executeQuery(args);
      if (this.sseServer) {
        this.sseServer.broadcastEvent("query_executed", {
          jobName: args.jobName || args.jobId,
          queryCount: Array.isArray(args.queries) ? args.queries.length : Object.keys(args).filter(k => k.match(/^Query\d+$/)).length,
          result,
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    }
    if (toolName === "get_connection_tables") {
      const { workspaceId } = args;
      return this.withWorkspaceOverride(workspaceId, async () => {
        return this.connectionService.getConnectionTables(args);
      });
    }
    if (toolName === "get_table_columns") {
      const { workspaceId } = args;
      return this.withWorkspaceOverride(workspaceId, async () => {
        return this.connectionService.getTableColumns(args);
      });
    }
    if (toolName === "get_job_tables") {
      const { workspaceId } = args;
      return this.withWorkspaceOverride(workspaceId, async () => {
        return this.jobService.getJobTables(args);
      });
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  // Configuration handler
  private async handleConfigOperation(args: ConfigParams): Promise<any> {
    const { action } = args;
    
    if (!isConfigAction(action)) {
      throw new Error(`Invalid config action: ${action}`);
    }

    switch (action) {
      case "get":
        return this.syncConfigService.getCurrentConfig();
      
      case "update": {
        // Remove action from args before passing to update
        const { action: _, ...updateParams } = args;
        const result = await this.syncConfigService.updateConfig(updateParams);
        
        if (result.success && this.sseServer) {
          this.sseServer.broadcastEvent("config_updated", {
            timestamp: new Date().toISOString(),
            message: result.message,
            testResult: result.testResult
          });
        }
        
        return result;
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Connection handlers with full type safety
  private async handleConnectionRead(args: ConnectionReadParams): Promise<any> {
    const { action, workspaceId } = args;
    
    if (!isConnectionReadAction(action)) {
      throw new Error(`Invalid connection read action: ${action}`);
    }

    return this.withWorkspaceOverride(workspaceId, async () => {
      switch (action) {
        case "list": {
          const { filter, select, top, skip } = args;
          return this.connectionService.listConnections({ 
            ...(filter !== undefined && { filter }),
            ...(select !== undefined && { select }),
            ...(top !== undefined && { top }),
            ...(skip !== undefined && { skip })
          });
        }
        
        case "count": {
          const { filter } = args;
          return this.connectionService.countConnections({ filter });
        }
        
        case "get": {
          assertDefined(args.name, "Connection name is required for get action");
          return this.connectionService.getConnection(args.name);
        }
        
        case "test": {
          assertDefined(args.name, "Connection name is required for test action");
          const { name, providerName, verbosity } = args;
          return this.connectionService.testConnection({ name, providerName, verbosity });
        }
        
        default: {
          const _exhaustive: never = action;
          throw new Error(`Unhandled action: ${_exhaustive}`);
        }
      }
    });
  }

  private async handleConnectionWrite(args: ConnectionWriteParams): Promise<any> {
    const { action, name, workspaceId } = args;
    
    if (!isConnectionWriteAction(action)) {
      throw new Error(`Invalid connection write action: ${action}`);
    }

    return this.withWorkspaceOverride(workspaceId, async () => {
      switch (action) {
        case "create": {
          assertDefined(args.providerName, "Provider name is required for create");
          assertDefined(args.connectionString, "Connection string is required for create");
          
          const { providerName, connectionString, verbosity } = args;
          return this.connectionService.createConnection({
            name,
            providerName,
            connectionString,
            verbosity
          });
        }
        
        case "update": {
          const { connectionString, verbosity } = args;
          return this.connectionService.updateConnection({
            name,
            connectionString,
            verbosity
          });
        }
        
        case "delete": {
          return this.connectionService.deleteConnection({ name });
        }
        
        default: {
          const _exhaustive: never = action;
          throw new Error(`Unhandled action: ${_exhaustive}`);
        }
      }
    });
  }

  // Job handlers with full type safety
  private async handleJobRead(args: JobReadParams): Promise<any> {
    const { action, workspaceId } = args;
    
    if (!isJobReadAction(action)) {
      throw new Error(`Invalid job read action: ${action}`);
    }

    return this.withWorkspaceOverride(workspaceId, async () => {
      switch (action) {
        case "list": {
          const { filter, select, top, skip, orderby } = args;
          return this.jobService.listJobs({ filter, select, top, skip, orderby });
        }
        
        case "count": {
          const { filter } = args;
          return this.jobService.countJobs({ filter });
        }
        
        case "get": {
          assertDefined(args.jobName, "Job name is required for get action");
          return this.jobService.getJob(args.jobName);
        }
        
        case "status": {
          if (!args.jobName && !args.jobId) {
            throw new Error("Either jobName or jobId is required for status action");
          }
          const { jobName, jobId, pushOnQuery } = args;
          return this.jobService.getJobStatus({ jobName, jobId, pushOnQuery });
        }
        
        case "history": {
          const { filter, select, top, skip, orderby } = args;
          return this.jobService.getJobHistory({ filter, select, top, skip, orderby });
        }
        
        case "logs": {
          if (!args.jobName && !args.jobId) {
            throw new Error("Either jobName or jobId is required for logs action");
          }
          const { jobName, jobId, days } = args;
          return this.jobService.getJobLogs({ jobName, jobId, days });
        }
        
        default: {
          const _exhaustive: never = action;
          throw new Error(`Unhandled action: ${_exhaustive}`);
        }
      }
    });
  }

  private async handleJobWrite(args: JobWriteParams): Promise<any> {
    const { action, jobName, workspaceId } = args;
    
    if (!isJobWriteAction(action)) {
      throw new Error(`Invalid job write action: ${action}`);
    }

    return this.withWorkspaceOverride(workspaceId, async () => {
      switch (action) {
      case "create": {
        assertDefined(args.source, "Source is required for job creation");
        assertDefined(args.destination, "Destination is required for job creation");
        
        // Pass all parameters through, service will handle the mapping
        return this.jobService.createJob(args as any);
      }
      
      case "update": {
        // Pass all parameters through, service will handle the mapping
        return this.jobService.updateJob(args as any);
      }
      
        case "delete": {
          return this.jobService.deleteJob({ jobName });
        }
        
        default: {
          const _exhaustive: never = action;
          throw new Error(`Unhandled action: ${_exhaustive}`);
        }
      }
    });
  }

  // Task handlers with full type safety
  private async handleTaskRead(args: TaskReadParams): Promise<any> {
    const { workspaceId } = args;
    // Apply default action if not provided
    const action = args.action || "get";
    
    if (!isTaskReadAction(action)) {
      throw new Error(`Invalid task read action: ${action}`);
    }

    return this.withWorkspaceOverride(workspaceId, async () => {
      switch (action) {
        case "list": {
          const { filter, select, top, skip } = args;
          return this.taskService.listTasks({ filter, select, top, skip });
        }
        
        case "count": {
          const { filter } = args;
          return this.taskService.countTasks({ filter });
        }
        
        case "get": {
          assertDefined(args.jobName, "Job name is required for get action");
          return this.taskService.getTask(args.jobName, args.select);
        }
        
        default: {
          const _exhaustive: never = action;
          throw new Error(`Unhandled action: ${_exhaustive}`);
        }
      }
    });
  }

  private async handleTaskWrite(args: TaskWriteParams): Promise<any> {
    const { action, jobName } = args;
    
    if (!isTaskWriteAction(action)) {
      throw new Error(`Invalid task write action: ${action}`);
    }

    // Ensure taskId is always treated as string
    if (args.taskId !== undefined) {
      args.taskId = toIdString(args.taskId);
    }

    switch (action) {
      case "create": {
        const { query, table, index } = args;
        return this.taskService.createTask({ jobName, query, table, index });
      }
      
      case "update": {
        assertDefined(args.taskId, "Task ID is required for update");
        const { taskId, query, table, index } = args;
        return this.taskService.updateTask({ jobName, taskId, query, table, index });
      }
      
      case "delete": {
        assertDefined(args.taskId, "Task ID is required for delete");
        const { taskId } = args;
        return this.taskService.deleteTask({ jobName, taskId });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Transformation handlers with full type safety
  private async handleTransformationRead(args: TransformationReadParams): Promise<any> {
    const { action } = args;
    
    if (!isTransformationReadAction(action)) {
      throw new Error(`Invalid transformation read action: ${action}`);
    }

    switch (action) {
      case "list": {
        const { filter, select, top, skip } = args;
        return this.transformationService.listTransformations({ filter, select, top, skip });
      }
      
      case "count": {
        const { filter } = args;
        return this.transformationService.countTransformations({ filter });
      }
      
      case "get": {
        assertDefined(args.transformationName, "Transformation name is required for get action");
        return this.transformationService.getTransformation(args.transformationName);
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  private async handleTransformationWrite(args: TransformationWriteParams): Promise<any> {
    const { action, transformationName } = args;
    
    if (!isTransformationWriteAction(action)) {
      throw new Error(`Invalid transformation write action: ${action}`);
    }

    switch (action) {
      case "create": {
        assertDefined(args.connection, "Connection is required for transformation creation");
        // Pass all parameters through, service will handle the mapping
        return this.transformationService.createTransformation(args as any);
      }
      
      case "update": {
        // Pass all parameters through, service will handle the mapping
        return this.transformationService.updateTransformation(args as any);
      }
      
      case "delete": {
        return this.transformationService.deleteTransformation({ transformationName });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // User handlers with full type safety
  private async handleUserRead(args: UserReadParams): Promise<any> {
    const { action } = args;
    
    if (!isUserReadAction(action)) {
      throw new Error(`Invalid user read action: ${action}`);
    }

    switch (action) {
      case "list": {
        const { filter, select, top, skip } = args;
        return this.userService.listUsers({ filter, select, top, skip });
      }
      
      case "count": {
        const { filter } = args;
        return this.userService.countUsers({ filter });
      }
      
      case "get": {
        assertDefined(args.user, "Username is required for get action");
        return this.userService.getUser(args.user);
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  private async handleUserWrite(args: UserWriteParams): Promise<any> {
    const { action } = args;
    
    if (!isUserWriteAction(action)) {
      throw new Error(`Invalid user write action: ${action}`);
    }

    switch (action) {
      case "create": {
        // Check if it's bulk creation
        if (args.users && Array.isArray(args.users) && args.users.length > 1) {
          return this.userService.createUsers({ users: args.users });
        }
        
        // Single user creation
        if (args.users && Array.isArray(args.users) && args.users.length === 1) {
          const user = args.users[0];
          return this.userService.createUser(user);
        }
        
        // Direct parameters
        assertDefined(args.user, "Username is required for user creation");
        assertDefined(args.password, "Password is required for user creation");
        assertDefined(args.roles, "User role is required for user creation");
        
        const { user, password, roles, active, federationId } = args;
        return this.userService.createUser({ user, password, roles, active, federationId });
      }
      
      case "update": {
        assertDefined(args.user, "Username is required for update");
        const { user, password, roles, active, expiredIn, federationId } = args;
        return this.userService.updateUser({ user, password, roles, active, expiredIn, federationId });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Request handlers with full type safety
  private async handleRequestRead(args: RequestReadParams): Promise<any> {
    const { action } = args;
    
    if (!isRequestReadAction(action)) {
      throw new Error(`Invalid request read action: ${action}`);
    }

    switch (action) {
      case "list": {
        const { filter, select, top, skip } = args;
        return this.requestService.listRequests({ filter, select, top, skip });
      }
      
      case "count": {
        const { filter } = args;
        return this.requestService.countRequests({ filter });
      }
      
      case "get": {
        assertDefined(args.id, "Request ID is required for get action");
        return this.requestService.getRequest(args.id);
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  private async handleRequestWrite(args: RequestWriteParams): Promise<any> {
    const { action } = args;
    
    if (!isRequestWriteAction(action)) {
      throw new Error(`Invalid request write action: ${action}`);
    }

    switch (action) {
      case "delete": {
        assertDefined(args.id, "Request ID is required for delete");
        return this.requestService.deleteRequest({ id: args.id });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // History handlers with full type safety
  private async handleHistoryRead(args: HistoryReadParams): Promise<any> {
    const { action } = args;
    
    if (!isHistoryReadAction(action)) {
      throw new Error(`Invalid history read action: ${action}`);
    }

    switch (action) {
      case "list": {
        const { filter, select, top, skip, orderby } = args;
        return this.historyService.listHistory({ filter, select, top, skip, orderby });
      }
      
      case "count": {
        const { filter } = args;
        return this.historyService.countHistory({ filter });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Certificate handlers with full type safety
  private async handleCertificateRead(args: CertificateReadParams): Promise<any> {
    const { action } = args;
    
    if (!isCertificateReadAction(action)) {
      throw new Error(`Invalid certificate read action: ${action}`);
    }

    switch (action) {
      case "list": {
        const { filter, select, top, skip } = args;
        return this.certificateService.listCertificates({ filter, select, top, skip });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  private async handleCertificateWrite(args: CertificateWriteParams): Promise<any> {
    const { action } = args;
    
    if (!isCertificateWriteAction(action)) {
      throw new Error(`Invalid certificate write action: ${action}`);
    }

    switch (action) {
      case "create": {
        assertDefined(args.name, "Certificate name is required");
        assertDefined(args.data, "Certificate data is required");
        assertDefined(args.storeType, "Store type is required");
        
        const { name, data, storeType } = args;
        return this.certificateService.createCertificate({ name, data, storeType });
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Workspace handlers
  private async handleWorkspaceRead(args: WorkspaceReadParams): Promise<any> {
    const { action } = args;
    
    if (!isWorkspaceReadAction(action)) {
      throw new Error(`Invalid workspace read action: ${action}`);
    }

    switch (action) {
      case "list":
        return this.workspaceService.listWorkspaces(args);
      
      case "count":
        return this.workspaceService.countWorkspaces(args);
      
      case "get": {
        if (args.id) {
          return this.workspaceService.getWorkspaceById(args.id);
        } else if (args.name) {
          return this.workspaceService.getWorkspaceByName(args.name);
        } else {
          throw new Error("Either workspace name or ID is required for get action");
        }
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  private async handleWorkspaceWrite(args: WorkspaceWriteParams): Promise<any> {
    const { action } = args;
    
    if (!isWorkspaceWriteAction(action)) {
      throw new Error(`Invalid workspace write action: ${action}`);
    }

    switch (action) {
      case "create": {
        assertDefined(args.name, "Workspace name is required");
        return this.workspaceService.createWorkspace({ name: args.name });
      }
      
      case "update": {
        assertDefined(args.newName, "New workspace name is required for update");
        
        if (args.id) {
          return this.workspaceService.updateWorkspaceById(args.id, args.newName);
        } else if (args.name) {
          return this.workspaceService.updateWorkspace({ name: args.name, newName: args.newName });
        } else {
          throw new Error("Either workspace name or ID is required for update action");
        }
      }
      
      case "delete": {
        if (args.id) {
          await this.workspaceService.deleteWorkspaceById(args.id);
          return { success: true, message: `Workspace with ID '${args.id}' deleted successfully` };
        } else if (args.name) {
          await this.workspaceService.deleteWorkspace(args.name);
          return { success: true, message: `Workspace '${args.name}' deleted successfully` };
        } else {
          throw new Error("Either workspace name or ID is required for delete action");
        }
      }
      
      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action: ${_exhaustive}`);
      }
    }
  }

  // Transport methods
  async startStdio(ssePort?: number): Promise<void> {
    // Start SSE server for debug events (optional)
    if (ssePort) {
      try {
        this.sseServer = new SSEServer();
        await this.sseServer.listen(ssePort);
        
        // Only log if server actually started
        if (this.sseServer.isRunning()) {
          this.log(`Debug event server listening on port ${ssePort} (optional)`);
        }
      } catch (error) {
        // SSE server is optional, so don't fail if it can't start
        this.log(`Debug event server could not start: ${error}`);
      }
    }

    // Start MCP server with stdio transport
    this.stdioTransport = new StdioServerTransport();
    await this.server.connect(this.stdioTransport);
    
    this.log("MCP server ready with stdio transport");
  }

  async startHttp(httpPort: number = 3000): Promise<void> {
    // No separate SSE server needed for HTTP transport
    // The HTTP transport has its own streaming endpoint
    
    // Start MCP server with HTTP transport
    this.httpTransport = new StreamableHttpTransport({
      port: httpPort,
      path: '/mcp/v1',
      cors: true,
      timeout: 30000
    });
    
    // Start the transport first
    await this.httpTransport.start();
    
    // Then connect the MCP server
    await this.server.connect(this.httpTransport);
    
    this.log(`MCP server ready with HTTP transport on port ${httpPort}`);
  }

  async startBoth(httpPort: number = 3000, ssePort: number = 3001): Promise<void> {
    // Start optional debug SSE server
    this.sseServer = new SSEServer();
    await this.sseServer.listen(ssePort);
    
    // Create two separate server instances for dual transport
    // The MCP SDK doesn't support multiple transports on one server
    
    // Server 1: Stdio transport
    const stdioServer = new Server(
      {
        name: "cdata-sync-mcp-server-stdio",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );
    
    // Set up handlers for stdio server (duplicate the main server's handlers)
    stdioServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: getAllTools() };
    });
    
    stdioServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Call the same handler method we use for the main server
      const { name, arguments: args } = request.params;
      try {
        const validation = this.validateToolParameters(name, args || {});
        if (!validation.valid) {
          throw new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`);
        }
        const result = await this.handleToolCall(name as keyof ToolParamMap, args || {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        let errorMessage = `Tool execution failed: ${error.message}`;
        if (error.response?.status === 400) {
          errorMessage += ` (Bad Request - check parameter format)`;
        } else if (error.response?.status === 404) {
          errorMessage += ` (Not Found - resource doesn't exist)`;
        } else if (error.response?.status === 401) {
          errorMessage += ` (Unauthorized - check authentication)`;
        }
        if (error.response?.data?.error?.message) {
          errorMessage += ` - API Error: ${error.response.data.error.message}`;
        }
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
    
    this.stdioTransport = new StdioServerTransport();
    await stdioServer.connect(this.stdioTransport);
    
    // Server 2: HTTP transport (using the main server)
    this.httpTransport = new StreamableHttpTransport({
      port: httpPort,
      path: '/mcp/v1',
      cors: true,
      timeout: 30000
    });
    
    await this.httpTransport.start();
    await this.server.connect(this.httpTransport);
    
    this.log(`MCP server ready with dual transports:`);
    this.log(`  - Stdio transport: active`);
    this.log(`  - HTTP transport: port ${httpPort}`);
    this.log(`  - Debug events: port ${ssePort} (optional)`);
  }

  async stop(): Promise<void> {
    // Close transports
    if (this.httpTransport) {
      await this.httpTransport.close();
    }
    
    // Close SSE server if running
    if (this.sseServer) {
      await this.sseServer.close();
    }
  }

  // Backward compatibility
  async start(port: number = 3001): Promise<void> {
    // Default to stdio for backward compatibility
    await this.startStdio(port);
  }
}