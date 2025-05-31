// src/server/CDataMCPServer.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

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
  ConfigParams,
  isConnectionReadAction, isConnectionWriteAction,
  isJobReadAction, isJobWriteAction,
  isTaskReadAction, isTaskWriteAction,
  isTransformationReadAction, isTransformationWriteAction,
  isUserReadAction, isUserWriteAction,
  isRequestReadAction, isRequestWriteAction,
  isHistoryReadAction, isCertificateReadAction, isCertificateWriteAction,
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
  private sseServer: SSEServer;

  constructor(config: CDataConfig) {
    this.syncClient = new CDataSyncApiClient(config);
    
    // Create config service with callback to update all services
    this.syncConfigService = new SyncConfigService(config, (newConfig) => {
      this.handleConfigChange(newConfig);
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
    this.sseServer = new SSEServer();

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

  private handleConfigChange(newConfig: CDataConfig): void {
    // Create new API client with new config
    this.syncClient = new CDataSyncApiClient(newConfig);
    
    // Recreate all services with new client
    this.connectionService = new ConnectionService(this.syncClient);
    this.jobService = new JobService(this.syncClient);
    this.taskService = new TaskService(this.syncClient);
    this.transformationService = new TransformationService(this.syncClient);
    this.requestService = new RequestService(this.syncClient);
    this.userService = new UserService(this.syncClient);
    this.historyService = new HistoryService(this.syncClient);
    this.certificateService = new CertificateService(this.syncClient);
    
    // Broadcast configuration change event
    this.sseServer.broadcastEvent("config_changed", {
      timestamp: new Date().toISOString(),
      baseUrl: newConfig.baseUrl,
      authType: newConfig.authToken ? 'token' : 'basic'
    });
    
    if (process.env.MCP_MODE) {
      console.error("CData Sync connection reconfigured:", newConfig.baseUrl);
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
    this.sseServer.broadcastEvent("tool_execution", {
      tool: toolName,
      args,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.executeToolMethod(toolName, args);
      
      this.sseServer.broadcastEvent("tool_success", {
        tool: toolName,
        timestamp: new Date().toISOString(),
      });

      return result as ToolResultMap[T];
    } catch (error: any) {
      this.sseServer.broadcastEvent("tool_error", {
        tool: toolName,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
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
      const result = await this.jobService.executeJob(args);
      this.sseServer.broadcastEvent("job_executed", {
        jobName: args.jobName || args.jobId,
        result,
        timestamp: new Date().toISOString(),
      });
      return result;
    }
    if (toolName === "cancel_job") {
      // Ensure jobId is string if provided
      if (args.jobId !== undefined) {
        args.jobId = toIdString(args.jobId);
      }
      const result = await this.jobService.cancelJob(args);
      this.sseServer.broadcastEvent("job_cancelled", {
        jobName: args.jobName || args.jobId,
        timestamp: new Date().toISOString(),
      });
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

    // Query and Schema Tools
    if (toolName === "execute_query") {
      const result = await this.jobService.executeQuery(args);
      this.sseServer.broadcastEvent("query_executed", {
        jobName: args.jobName || args.jobId,
        queryCount: Array.isArray(args.queries) ? args.queries.length : Object.keys(args).filter(k => k.match(/^Query\d+$/)).length,
        result,
        timestamp: new Date().toISOString(),
      });
      return result;
    }
    if (toolName === "get_connection_tables") {
      return this.connectionService.getConnectionTables(args);
    }
    if (toolName === "get_table_columns") {
      return this.connectionService.getTableColumns(args);
    }
    if (toolName === "get_job_tables") {
      return this.jobService.getJobTables(args);
    }

    // Diagnostic tool (if implemented)
    if (toolName === "diagnose_job_access") {
      return this.jobService.diagnoseJobAccess(args.jobName);
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
        
        if (result.success) {
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
    const { action } = args;
    
    if (!isConnectionReadAction(action)) {
      throw new Error(`Invalid connection read action: ${action}`);
    }

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
  }

  private async handleConnectionWrite(args: ConnectionWriteParams): Promise<any> {
    const { action, name } = args;
    
    if (!isConnectionWriteAction(action)) {
      throw new Error(`Invalid connection write action: ${action}`);
    }

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
  }

  // Job handlers with full type safety
  private async handleJobRead(args: JobReadParams): Promise<any> {
    const { action } = args;
    
    if (!isJobReadAction(action)) {
      throw new Error(`Invalid job read action: ${action}`);
    }

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
  }

  private async handleJobWrite(args: JobWriteParams): Promise<any> {
    const { action, jobName } = args;
    
    if (!isJobWriteAction(action)) {
      throw new Error(`Invalid job write action: ${action}`);
    }

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
  }

  // Task handlers with full type safety
  private async handleTaskRead(args: TaskReadParams): Promise<any> {
    const { action } = args;
    
    if (!isTaskReadAction(action)) {
      throw new Error(`Invalid task read action: ${action}`);
    }

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

  async start(port: number = 3001): Promise<void> {
    // Start SSE server (only if not in MCP mode)
    if (!process.env.MCP_MODE) {
      await this.sseServer.listen(port);
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log startup message
    if (process.env.MCP_MODE) {
      console.error("CData Sync MCP Server started");
    } else {
      console.log("CData Sync MCP Server started");
    }
  }
}