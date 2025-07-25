// src/services/ConnectionService.ts

import { BaseService } from "./BaseService.js";
import { ConnectionInfo } from "../types/api.js";
import {
  ConnectionListParams,
  ConnectionTestParams,
  ConnectionCreateParams,
  ConnectionUpdateParams,
  ConnectionDeleteParams,
  GetConnectionTablesParams,
  GetTableColumnsParams
} from "../types/parameters.js";
import {
  DeleteResponse,
  TestConnectionResponse,
  TableInfo,
  ColumnInfo,
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { IConnectionService } from "../types/services.js";

export class ConnectionService extends BaseService implements IConnectionService {
  protected getResourceName(): string {
    return 'Connection';
  }

  async listConnections(params: ConnectionListParams = {}): Promise<ConnectionInfo[]> {
    return this.callWithConfigCheck(async () => {
      const queryParams = this.buildQueryParams(params);
      const endpoint = `/connections${queryParams}`;
      
      const result = await this.syncClient.get<ApiResponse<ConnectionInfo>>(endpoint);
      return this.extractArray(result);
    });
  }

  async countConnections(params: Pick<ConnectionListParams, 'filter'> = {}): Promise<CountResponse> {
    // Use the enhanced count method with configuration error handling
    return this.getCountWithFallback(
      '/connections',     // Primary endpoint for $count
      '/connections',     // Fallback endpoint for listing
      params.filter
    );
  }

  async getConnection(name: string): Promise<ConnectionInfo> {
    return this.callWithConfigCheck(async () => {
      const endpoint = this.buildEntityEndpoint('/connections', name);
      return this.syncClient.get<ConnectionInfo>(endpoint);
    });
  }

  async testConnection(params: ConnectionTestParams): Promise<TestConnectionResponse> {
    return this.callWithConfigCheck(async () => {
      // Debug logging with proper typing
      if (process.env.MCP_MODE || process.env.DEBUG_HTTP) {
        console.error("=== TEST CONNECTION DEBUG ===");
        console.error("Input params:", JSON.stringify(params, null, 2));
      }

      const requestData: Record<string, any> = {
        // Documentation shows ConnectionName (capital C)
        ConnectionName: params.name,
      };

      // Optional parameters
      if (params.providerName) requestData.ProviderName = params.providerName;
      if (params.verbosity) requestData.Verbosity = params.verbosity;

      if (process.env.MCP_MODE || process.env.DEBUG_HTTP) {
        console.error("Prepared request data:", JSON.stringify(requestData, null, 2));
        console.error("=============================");
      }

      const result = await this.syncClient.post<any>("/testConnection", requestData);
      
      // Transform to standard response format
      return {
        success: true,
        message: `Connection '${params.name}' tested successfully`,
        details: result
      };
    });
  }

  async createConnection(params: ConnectionCreateParams): Promise<ConnectionInfo> {
    return this.callWithConfigCheck(async () => {
      const connectionData: Record<string, any> = {
        Name: params.name,
        ProviderName: params.providerName,
        ConnectionString: params.connectionString,
      };
      
      // Optional parameters
      if (params.verbosity) connectionData.Verbosity = params.verbosity;
      
      // Add workspace to request body if not default
      const workspace = this.getWorkspace();
      if (workspace && workspace !== 'default') {
        connectionData.WorkspaceId = workspace;
      }

      return this.syncClient.post<ConnectionInfo>("/connections", connectionData);
    });
  }

  async updateConnection(params: ConnectionUpdateParams): Promise<ConnectionInfo> {
    return this.callWithConfigCheck(async () => {
      const connectionData: Record<string, any> = {};
      
      // Documentation only shows ConnectionString as modifiable
      if (params.connectionString) connectionData.ConnectionString = params.connectionString;
      
      // Verbosity might work even if not documented
      if (params.verbosity) {
        if (process.env.MCP_MODE) {
          console.warn("Warning: Modifying Verbosity is not documented but might work");
        }
        connectionData.Verbosity = params.verbosity;
      }

      const endpoint = this.buildEntityEndpoint('/connections', params.name);
      return this.syncClient.put<ConnectionInfo>(endpoint, connectionData);
    });
  }

  async deleteConnection(params: ConnectionDeleteParams): Promise<DeleteResponse> {
    const endpoint = this.buildEntityEndpoint('/connections', params.name);
    return this.handleDelete(endpoint);
  }

  async getConnectionProperty(name: string, propertyName: string): Promise<string> {
    const endpoint = this.buildEntityEndpoint('/connections', name);
    return this.getProperty(endpoint, propertyName);
  }

  async getConnectionTables(params: GetConnectionTablesParams): Promise<TableInfo[]> {
    return this.callWithConfigCheck(async () => {
      const requestData: Record<string, any> = {
        ConnectionName: params.connectionName,
        TableOrView: params.tableOrView || "ALL",
      };

      // Add workspace context - explicit workspaceId parameter takes precedence
      const workspace = params.workspaceId || this.getWorkspace();
      if (workspace && workspace !== 'default') {
        requestData.WorkspaceId = workspace;
      }

      // Optional parameters
      if (params.schema) requestData.Schema = params.schema;
      
      // Documentation shows these as "True"/"False" with capital T/F
      if (params.includeCatalog !== undefined) {
        requestData.IncludeCatalog = params.includeCatalog ? "True" : "False";
      }
      if (params.includeSchema !== undefined) {
        requestData.IncludeSchema = params.includeSchema ? "True" : "False";
      }
      
      // These parameters might not be documented
      if (params.topTable !== undefined) {
        if (process.env.MCP_MODE) {
          console.warn("Warning: TopTable parameter is not documented");
        }
        requestData.TopTable = params.topTable.toString();
      }
      if (params.skipTable !== undefined) {
        if (process.env.MCP_MODE) {
          console.warn("Warning: SkipTable parameter is not documented");
        }
        requestData.SkipTable = params.skipTable.toString();
      }

      const result = await this.syncClient.post<ApiResponse<TableInfo>>("/getConnectionTables", requestData);
      return this.extractArray(result);
    });
  }

  async getTableColumns(params: GetTableColumnsParams): Promise<ColumnInfo[]> {
    return this.callWithConfigCheck(async () => {
      const requestData: Record<string, any> = {
        ConnectionName: params.connectionName,
        Table: params.table,
      };

      // Add workspace context - explicit workspaceId parameter takes precedence
      const workspace = params.workspaceId || this.getWorkspace();
      if (workspace && workspace !== 'default') {
        requestData.WorkspaceId = workspace;
      }

      const result = await this.syncClient.post<ApiResponse<ColumnInfo>>("/getConnectionTableColumns", requestData);
      return this.extractArray(result);
    });
  }
}