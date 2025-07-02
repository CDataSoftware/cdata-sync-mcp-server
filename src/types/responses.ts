// src/types/responses.ts

// OData response wrapper
export interface ODataResponse<T> {
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

// Standard responses
export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface DeleteResponse extends SuccessResponse {}

export interface TestConnectionResponse extends SuccessResponse {
  details?: any;
}

// Configuration responses
export interface ConfigurationInfo {
  baseUrl: string;
  authType: string;
  username?: string;
  hasPassword: boolean;
  hasAuthToken: boolean;
  isConfigured: boolean;
  workspace: string;
}

export interface ConfigUpdateResponse extends SuccessResponse {
  testResult?: any;
}

// Job execution responses
export interface JobExecutionResult {
  JobName: string;
  Status: string;
  Query: string;
  Result: string;
  Detail: string;
  RunStartDate: string;
}

export interface JobStatusResponse {
  jobId: string;
  jobName: string;
  status: string;
  queries?: Array<{
    query: string;
    status: string;
    detail?: string;
  }>;
}

export interface JobLogsResponse {
  jobName: string;
  jobId: string;
  logs: string;
  days: number;
}

// Table discovery responses
export interface TableInfo {
  TableName: string;
  Schema?: string;
  Catalog?: string;
  TableType?: string;
}

export interface ColumnInfo {
  ColumnName: string;
  DataType: string;
  IsNullable: boolean;
  MaxLength?: number;
  Precision?: number;
  Scale?: number;
  IsPrimaryKey?: boolean;
  IsForeignKey?: boolean;
  DefaultValue?: string;
}

// Bulk operation responses
export interface BulkUserCreateResponse extends SuccessResponse {
  created: number;
  failed: number;
  errors?: Array<{
    user: string;
    error: string;
  }>;
}

// Helper types
export type ApiResponse<T> = T | T[] | ODataResponse<T>;
export type CountResponse = number;

// Type guards
export function isODataResponse<T>(response: any): response is ODataResponse<T> {
  return response && 
         typeof response === 'object' && 
         'value' in response && 
         Array.isArray(response.value);
}

export function isSuccessResponse(response: any): response is SuccessResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         typeof response.success === 'boolean';
}

// Response extractors
export function extractArray<T>(response: ApiResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  if (isODataResponse<T>(response)) return response.value;
  return [response as T];
}

export function extractCount(response: any): number {
  if (typeof response === 'number') return response;
  if (typeof response === 'string') return parseInt(response, 10);
  if (response && typeof response === 'object' && '@odata.count' in response) {
    return response['@odata.count'];
  }
  throw new Error('Unable to extract count from response');
}