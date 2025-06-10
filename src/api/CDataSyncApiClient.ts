// src/api/CDataSyncApiClient.ts
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { CDataConfig } from "../types/config.js";
import { HttpMethod } from "../types/parameters.js";

// Custom JSON parser that preserves large numbers as strings
function parseJSONWithBigInt(text: string): any {
  // Improved regex that catches:
  // - Any field ending with 'Id' or 'id' (case insensitive)
  // - Common numeric fields that might have large values
  // - Count fields, size fields, timeout fields, etc.
  const bigIntRegex = /"(\w*[Ii]d|Count|Size|Affected|Days|Timeout|Interval|ExpirationDays|Keysize|Runtime|Records|Rows|Total|Limit|Offset|Skip|Top|Index|Version|Port|Code|Status)"\s*:\s*(\d{16,})/g;
  
  // Replace large numbers with string versions
  const modifiedText = text.replace(bigIntRegex, '"$1":"$2"');
  
  return JSON.parse(modifiedText);
}

export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export class CDataSyncApiClient {
  private credentialPromptHandler?: () => Promise<{username?: string; password?: string; authToken?: string}>;

  constructor(private config: CDataConfig) {}

  setCredentialPromptHandler(handler: () => Promise<{username?: string; password?: string; authToken?: string}>) {
    this.credentialPromptHandler = handler;
  }

  async makeRequest<T = any>(
    endpoint: string,
    method: HttpMethod = "GET",
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    // Remove the $oas suffix for actual API calls
    const baseUrl = (this.config.baseUrl || '').replace('/$oas', '').replace('/\/$/', '');
    const url = `${baseUrl}${endpoint}`;
    
    const headers = this.buildHeaders(options?.headers);
    const timeout = options?.timeout || 30000;

    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      headers,
      timeout,
      // Custom response transformer to handle large numbers
      transformResponse: [(data) => this.transformResponse(data)],
      // Ensure request data with large numbers is handled properly
      transformRequest: [(data) => this.transformRequest(data)],
    };

    // Only add data for methods that support it
    if (method !== 'GET' && method !== 'DELETE') {
      axiosConfig.data = data;
    }

    try {
      const response: AxiosResponse<T> = await axios(axiosConfig);
      return response.data;
    } catch (error: any) {
      // Handle authentication errors
      if (error.response?.status === 401 && this.credentialPromptHandler) {
        // Check if we have no credentials configured
        const hasCredentials = this.config.authToken || (this.config.username && this.config.password);
        
        if (!hasCredentials) {
          try {
            // Prompt for credentials
            const credentials = await this.credentialPromptHandler();
            
            // Update config with new credentials
            if (credentials.authToken) {
              this.config.authToken = credentials.authToken;
              this.config.username = undefined;
              this.config.password = undefined;
            } else if (credentials.username && credentials.password) {
              this.config.username = credentials.username;
              this.config.password = credentials.password;
              this.config.authToken = undefined;
            }
            
            // Retry the request with new credentials
            const retryHeaders = this.buildHeaders(options?.headers);
            const retryConfig: AxiosRequestConfig = {
              ...axiosConfig,
              headers: retryHeaders
            };
            
            const retryResponse: AxiosResponse<T> = await axios(retryConfig);
            return retryResponse.data;
          } catch (retryError: any) {
            // If retry fails, throw the original error
            if (process.env.MCP_MODE) {
              this.logError(method, url, retryError);
            }
            throw retryError;
          }
        }
      }
      
      // Enhanced error logging
      if (process.env.MCP_MODE) {
        this.logError(method, url, error);
      }
      
      throw error;
    }
  }

  // Convenience methods with proper typing
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, 'GET', undefined, options);
  }

  async post<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, 'POST', data, options);
  }

  async put<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, 'PUT', data, options);
  }

  async delete<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, 'DELETE', undefined, options);
  }

  async patch<T, D = any>(endpoint: string, data: D, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, 'PATCH', data, options);
  }

  private buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders
    };

    // Add authentication
    if (this.config.authToken) {
      headers["x-cdata-authtoken"] = this.config.authToken;
    } else if (this.config.username && this.config.password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`;
    }

    return headers;
  }

  private transformResponse(data: any): any {
    if (typeof data === 'string') {
      try {
        // Use custom parser for JSON responses
        return parseJSONWithBigInt(data);
      } catch (e) {
        // If it's not JSON, return as-is
        return data;
      }
    }
    return data;
  }

  private transformRequest(data: any): string | any {
    if (data && typeof data === 'object') {
      // Convert any numeric IDs to strings before sending
      const transformed = { ...data };
      
      // Extended list of fields that should be strings
      // This list is more comprehensive and catches more potential ID fields
      const idFields = [
        'TaskId', 'JobId', 'UserId', 'TransformationId', 'Id', 'HistoryId',
        'RequestId', 'ConnectionId', 'CertificateId', 'LogId', 'SessionId',
        'RunId', 'ExecutionId', 'InstanceId', 'ParentId', 'RootId',
        // Also handle lowercase variants
        'taskId', 'jobId', 'userId', 'transformationId', 'id', 'historyId'
      ];
      
      for (const field of idFields) {
        if (transformed[field] !== undefined && typeof transformed[field] !== 'string') {
          transformed[field] = transformed[field].toString();
        }
      }
      
      return JSON.stringify(transformed);
    }
    return data;
  }

  private logError(method: string, url: string, error: any): void {
    console.error(`CData Sync API Error: ${method} ${url} - ${error.message}`);
    if (error.response?.data) {
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error(`Status code: ${error.response.status}`);
    }
  }
}