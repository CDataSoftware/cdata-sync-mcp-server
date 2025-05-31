// src/types/parameters.ts

// Common enums and types
export type VerbosityLevel = '1' | '2' | '3' | '4';
export type JobType = 1 | 2 | 3 | 7 | 10;
export type UserRole = 'cdata_admin' | 'cdata_standard' | 'cdata_job_creator' | 'cdata_support';
export type TransformationTriggerMode = 'None' | 'Scheduled' | 'AfterJob';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Base parameter types for common patterns
export interface BaseListParams {
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface BaseOrderedListParams extends BaseListParams {
  orderby?: string;
}

// Connection-specific parameters
export interface ConnectionListParams extends BaseListParams {}

export interface ConnectionGetParams {
  name: string;
}

export interface ConnectionTestParams {
  name: string;
  providerName?: string;
  verbosity?: VerbosityLevel;
}

export interface ConnectionCreateParams {
  name: string;
  providerName: string;
  connectionString: string;
  verbosity?: VerbosityLevel;
}

export interface ConnectionUpdateParams {
  name: string;
  connectionString?: string;
  verbosity?: VerbosityLevel;
}

export interface ConnectionDeleteParams {
  name: string;
}

// Job-specific parameters
export interface JobListParams extends BaseOrderedListParams {}

export interface JobGetParams {
  jobName: string;
}

export interface JobStatusParams {
  jobName?: string;
  jobId?: string;
  pushOnQuery?: boolean;
}

export interface JobHistoryParams extends BaseOrderedListParams {}

export interface JobLogsParams {
  jobName?: string;
  jobId?: string;
  days?: number;
}

export interface JobCreateParams {
  jobName: string;
  source: string;
  destination: string;
  scheduled?: boolean;
  scheduledCron?: string;
  notifyWindowsEvent?: boolean;
  sendEmailNotification?: boolean;
  notifyEmailTo?: string;
  notifyEmailSubject?: string;
  emailErrorOnly?: boolean;
  verbosity?: VerbosityLevel;
  tableNamePrefix?: string;
  useGmtDateTime?: boolean;
  truncateTableData?: boolean;
  dropTable?: boolean;
  autoTruncateStrings?: boolean;
  continueOnError?: boolean;
  alterSchema?: boolean;
  replicateInterval?: string;
  replicateIntervalUnit?: string;
  replicateStartDate?: string;
  batchSize?: string;
  commandTimeout?: string;
  skipDeleted?: boolean;
  otherCacheOptions?: string;
  cacheSchema?: string;
  preJob?: string;
  postJob?: string;
  type?: JobType;
  queries?: string[];
}

export interface JobUpdateParams extends Partial<Omit<JobCreateParams, 'jobName'>> {
  jobName: string;
}

export interface JobDeleteParams {
  jobName: string;
}

export interface JobExecuteParams {
  jobName?: string;
  jobId?: string;
  waitForResults?: boolean;
  timeout?: number;
}

export interface JobCancelParams {
  jobName?: string;
  jobId?: string;
}

// Task-specific parameters
export interface TaskListParams extends BaseListParams {}

export interface TaskGetParams {
  jobName: string;
  select?: string;
}

export interface TaskCreateParams {
  jobName: string;
  query?: string;
  table?: string;
  index?: string;
}

export interface TaskUpdateParams {
  jobName: string;
  taskId: string;
  query?: string;
  table?: string;
  index?: string;
}

export interface TaskDeleteParams {
  jobName: string;
  taskId: string;
}

// Transformation-specific parameters
export interface TransformationListParams extends BaseListParams {}

export interface TransformationGetParams {
  transformationName: string;
}

export interface TransformationCreateParams {
  transformationName: string;
  connection: string;
  transformationTriggerMode?: TransformationTriggerMode;
  triggerAfterJob?: string;
  triggerTasks?: string;
  scheduledCron?: string;
  sendEmailNotification?: boolean;
  notifyEmailTo?: string;
  notifyEmailSubject?: string;
  emailErrorOnly?: boolean;
  verbosity?: VerbosityLevel;
  queries?: string[];
  commandTimeout?: string;
  automaticJobRetry?: boolean;
}

export interface TransformationUpdateParams extends Partial<Omit<TransformationCreateParams, 'transformationName'>> {
  transformationName: string;
}

export interface TransformationDeleteParams {
  transformationName: string;
}

// User-specific parameters
export interface UserListParams extends BaseListParams {}

export interface UserGetParams {
  user: string;
}

export interface UserCreateParams {
  user: string;
  password: string;
  roles: UserRole;
  active?: boolean;
  federationId?: string;
}

export interface UserBulkCreateParams {
  users: Array<{
    user: string;
    password: string;
    roles: UserRole;
    active?: boolean;
    federationId?: string;
  }>;
}

export interface UserUpdateParams {
  user: string;
  password?: string;
  roles?: UserRole;
  active?: boolean;
  expiredIn?: number;
  federationId?: string;
}

// Request log parameters
export interface RequestListParams extends BaseListParams {}

export interface RequestGetParams {
  id: string;
}

export interface RequestDeleteParams {
  id: string;
}

// History parameters
export interface HistoryListParams extends BaseOrderedListParams {}

// Certificate parameters
export interface CertificateListParams extends BaseListParams {}

export interface CertificateCreateParams {
  name: string;
  data: string;
  storeType: string;
}

// Query execution parameters
export interface ExecuteQueryParams {
  jobName?: string;
  jobId?: string;
  queries: string[];
  waitForResults?: boolean;
  timeout?: number;
}

// Table discovery parameters
export interface GetConnectionTablesParams {
  connectionName: string;
  tableOrView?: 'TABLES' | 'VIEWS' | 'ALL';
  schema?: string;
  includeCatalog?: boolean;
  includeSchema?: boolean;
  topTable?: number;
  skipTable?: number;
}

export interface GetTableColumnsParams {
  connectionName: string;
  table: string;
}

export interface GetJobTablesParams extends GetConnectionTablesParams {
  jobId: string;
}

// Configuration parameters
export interface ConfigGetParams {
  // No parameters needed
}

export interface ConfigUpdateParams {
  baseUrl?: string;
  authToken?: string;
  username?: string;
  password?: string;
  clearAuth?: boolean;
}

// Action-based parameter types for tools
export type ConnectionReadAction = 'list' | 'count' | 'get' | 'test';
export type ConnectionWriteAction = 'create' | 'update' | 'delete';
export type JobReadAction = 'list' | 'count' | 'get' | 'status' | 'history' | 'logs';
export type JobWriteAction = 'create' | 'update' | 'delete';
export type TaskReadAction = 'list' | 'count' | 'get';
export type TaskWriteAction = 'create' | 'update' | 'delete';
export type TransformationReadAction = 'list' | 'count' | 'get';
export type TransformationWriteAction = 'create' | 'update' | 'delete';
export type UserReadAction = 'list' | 'count' | 'get';
export type UserWriteAction = 'create' | 'update';
export type RequestReadAction = 'list' | 'count' | 'get';
export type RequestWriteAction = 'delete';
export type HistoryReadAction = 'list' | 'count';
export type CertificateReadAction = 'list';
export type CertificateWriteAction = 'create';
export type ConfigAction = 'get' | 'update';