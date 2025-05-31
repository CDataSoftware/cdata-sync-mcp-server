// src/services/BaseService.ts

import { CDataSyncApiClient } from "../api/CDataSyncApiClient.js";
import { BaseListParams, BaseOrderedListParams } from "../types/parameters.js";
import { ApiResponse, DeleteResponse, extractArray } from "../types/responses.js";

export abstract class BaseService {
  constructor(protected syncClient: CDataSyncApiClient) {}

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

  // Common count extraction
  protected async extractCount(response: any): Promise<number> {
    if (typeof response === 'number') return response;
    if (typeof response === 'string') return parseInt(response, 10);
    if (response && typeof response === 'object' && '@odata.count' in response) {
      return response['@odata.count'];
    }
    throw new Error('Unable to extract count from response');
  }

  // Common delete handling
  protected async handleDelete(endpoint: string, resourceName?: string): Promise<DeleteResponse> {
    await this.syncClient.delete(endpoint);
    
    // 204 No Content is success for DELETE operations
    return {
      success: true,
      message: `${resourceName || this.getResourceName()} deleted successfully`
    };
  }

  // Common property getter
  protected async getProperty(endpoint: string, propertyName: string): Promise<string> {
    return this.syncClient.get<string>(`${endpoint}/${propertyName}/$value`);
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