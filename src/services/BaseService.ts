// src/services/BaseService.ts

import { CDataSyncApiClient } from "../api/CDataSyncApiClient.js";
import { BaseListParams, BaseOrderedListParams } from "../types/parameters.js";
import { ApiResponse, DeleteResponse, extractArray } from "../types/responses.js";

export class ConfigurationError extends Error {
  constructor(message: string, public configurationRequired: boolean = true) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export abstract class BaseService {
  constructor(protected syncClient: CDataSyncApiClient) {}

  // Get current workspace from the API client
  protected getWorkspace(): string {
    return this.syncClient.getWorkspace();
  }

  // Temporarily use a different workspace for a single operation
  protected async withWorkspace<T>(workspace: string, operation: () => Promise<T>): Promise<T> {
    const originalWorkspace = this.syncClient.getWorkspace();
    try {
      this.syncClient.setWorkspace(workspace);
      return await operation();
    } finally {
      this.syncClient.setWorkspace(originalWorkspace);
    }
  }

  // Wrapper for API calls that provides helpful configuration errors
  protected async callWithConfigCheck<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      const workspaceContext = ` [workspace: ${this.getWorkspace()}]`;
      
      // Check if this looks like a configuration error
      if (error.code === 'ECONNREFUSED') {
        throw new ConfigurationError(
          `Cannot connect to CData Sync server. Please verify the base URL is correct and CData Sync is running. Use 'configure_sync_server' tool to update the base URL.${workspaceContext}`
        );
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new ConfigurationError(
          `CData Sync server hostname not found. Please verify the base URL is correct. Use 'configure_sync_server' tool to update the base URL.${workspaceContext}`
        );
      }
      
      if (error.response?.status === 401) {
        throw new ConfigurationError(
          `Authentication failed. Please verify your credentials are correct. Use 'configure_sync_server' tool to update authentication (authToken or username/password).${workspaceContext}`
        );
      }
      
      if (error.response?.status === 404 && error.config?.url?.includes('/api.rsc')) {
        throw new ConfigurationError(
          `CData Sync API endpoint not found. Please verify the base URL is correct and includes the correct path. Use 'configure_sync_server' tool to update the base URL.${workspaceContext}`
        );
      }
      
      // Add workspace context to other errors before re-throwing
      if (error.message && !error.message.includes('[workspace:')) {
        error.message = `${error.message}${workspaceContext}`;
      }
      
      // Re-throw original error if it's not a configuration issue
      throw error;
    }
  }

  // Common query parameter building
  protected buildQueryParams(params: BaseListParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.filter) queryParams.append("$filter", params.filter);
    if (params.select) queryParams.append("$select", params.select);
    if (params.top) queryParams.append("$top", params.top.toString());
    if (params.skip) queryParams.append("$skip", params.skip.toString());
    
    return queryParams.toString() ? `?${queryParams}` : '';
  }

  protected buildOrderedQueryParams(params: BaseOrderedListParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.filter) queryParams.append("$filter", params.filter);
    if (params.select) queryParams.append("$select", params.select);
    if (params.top) queryParams.append("$top", params.top.toString());
    if (params.skip) queryParams.append("$skip", params.skip.toString());
    if (params.orderby) queryParams.append("$orderby", params.orderby);
    
    return queryParams.toString() ? `?${queryParams}` : '';
  }

  // Common response extraction
  protected extractArray<T>(response: ApiResponse<T>): T[] {
    return extractArray(response);
  }

  // Enhanced count method with fallback and configuration error handling
  protected async getCountWithFallback(
    endpoint: string,
    fallbackEndpoint: string,
    filterParam?: string
  ): Promise<number> {
    return this.callWithConfigCheck(async () => {
      try {
        // First try the $count endpoint
        const queryParams = new URLSearchParams();
        if (filterParam) queryParams.append("$filter", filterParam);
        
        const countEndpoint = `${endpoint}/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
        const result = await this.syncClient.get<any>(countEndpoint);
        return this.extractCount(result);
      } catch (error: any) {
        // If 404 or method not allowed, fall back to listing and counting
        if (error.response?.status === 404 || error.response?.status === 405) {
          console.warn(`Count endpoint not supported for ${endpoint}, using fallback`);
          
          try {
            // Use fallback: get all items and count them
            const queryParams = new URLSearchParams();
            if (filterParam) queryParams.append("$filter", filterParam);
            queryParams.append("$select", "Id"); // Only get ID field for efficiency
            
            const listEndpoint = `${fallbackEndpoint}${queryParams.toString() ? `?${queryParams}` : ""}`;
            const result = await this.syncClient.get<any>(listEndpoint);
            const items = this.extractArray(result);
            return Array.isArray(items) ? items.length : 0;
          } catch (fallbackError) {
            console.error(`Both count and fallback failed for ${endpoint}:`, fallbackError);
            throw fallbackError;
          }
        }
        throw error;
      }
    });
  }

  // Common count extraction
  protected async extractCount(response: any): Promise<number> {
    if (typeof response === 'number') return response;
    if (typeof response === 'string') {
      const parsed = parseInt(response, 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (response && typeof response === 'object' && '@odata.count' in response) {
      return response['@odata.count'];
    }
    throw new Error('Unable to extract count from response');
  }

  // Common delete handling with configuration error support
  protected async handleDelete(endpoint: string, resourceName?: string): Promise<DeleteResponse> {
    return this.callWithConfigCheck(async () => {
      await this.syncClient.delete(endpoint);
      
      // 204 No Content is success for DELETE operations
      return {
        success: true,
        message: `${resourceName || this.getResourceName()} deleted successfully [workspace: ${this.getWorkspace()}]`
      };
    });
  }

  // Common property getter with configuration error support
  protected async getProperty(endpoint: string, propertyName: string): Promise<string> {
    return this.callWithConfigCheck(async () => {
      return this.syncClient.get<string>(`${endpoint}/${propertyName}/$value`);
    });
  }

  // Encode URI component safely
  protected encode(value: string): string {
    return encodeURIComponent(value);
  }

  // Build entity endpoint
  protected buildEntityEndpoint(basePath: string, identifier: string): string {
    return `${basePath}('${this.encode(identifier)}')`;
  }

  // Abstract method that subclasses must implement
  protected abstract getResourceName(): string;
}