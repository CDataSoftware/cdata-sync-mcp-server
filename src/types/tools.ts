// src/types/tools.ts

import {
  ConnectionReadAction, ConnectionWriteAction, JobReadAction, JobWriteAction,
  TaskReadAction, TaskWriteAction, TransformationReadAction, TransformationWriteAction,
  UserReadAction, UserWriteAction, RequestReadAction, RequestWriteAction,
  HistoryReadAction, CertificateReadAction, CertificateWriteAction, ConfigAction,
  VerbosityLevel, UserRole, JobType, TransformationTriggerMode
} from './parameters.js';

import {
  ConnectionInfo, JobInfo, TaskInfo, TransformationInfo, UserInfo,
  RequestInfo, HistoryInfo, CertificateInfo
} from './api.js';

import {
  DeleteResponse, TestConnectionResponse, JobExecutionResult, JobStatusResponse,
  JobLogsResponse, TableInfo, ColumnInfo, BulkUserCreateResponse,
  ConfigurationInfo, ConfigUpdateResponse, CountResponse
} from './responses.js';

// Tool parameter types with discriminated unions
export interface ConnectionReadParams {
  action: ConnectionReadAction;
  name?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  providerName?: string;
  verbosity?: VerbosityLevel;
}

export interface ConnectionWriteParams {
  action: ConnectionWriteAction;
  name: string;
  providerName?: string;
  connectionString?: string;
  verbosity?: VerbosityLevel;
  requireExplicitConnectionString?: boolean;
}

export interface JobReadParams {
  action: JobReadAction;
  jobName?: string;
  jobId?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  orderby?: string;
  pushOnQuery?: boolean;
  days?: number;
}

export interface JobWriteParams {
  action: JobWriteAction;
  jobName: string;
  source?: string;
  destination?: string;
  scheduled?: boolean;
  scheduledCron?: string;
  notifyEmailTo?: string;
  verbosity?: VerbosityLevel;
  truncateTableData?: boolean;
  dropTable?: boolean;
  type?: JobType;
  queries?: string[];
  requireExplicitValues?: boolean;
  [key: string]: any; // For other job parameters
}

export interface TaskReadParams {
  action: TaskReadAction;
  jobName?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface TaskWriteParams {
  action: TaskWriteAction;
  jobName: string;
  taskId?: string;
  query?: string;
  table?: string;
  index?: string;
}

export interface TransformationReadParams {
  action: TransformationReadAction;
  transformationName?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface TransformationWriteParams {
  action: TransformationWriteAction;
  transformationName: string;
  connection?: string;
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
  [key: string]: any; // For other transformation parameters
}

export interface UserReadParams {
  action: UserReadAction;
  user?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface UserWriteParams {
  action: UserWriteAction;
  user?: string;
  password?: string;
  roles?: UserRole;
  active?: boolean;
  federationId?: string;
  expiredIn?: number;
  users?: Array<{
    user: string;
    password: string;
    roles: UserRole;
    active?: boolean;
    federationId?: string;
  }>;
  requireSecurePasswords?: boolean;
}

export interface RequestReadParams {
  action: RequestReadAction;
  id?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface RequestWriteParams {
  action: RequestWriteAction;
  id: string;
}

export interface HistoryReadParams {
  action: HistoryReadAction;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  orderby?: string;
}

export interface CertificateReadParams {
  action: CertificateReadAction;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface CertificateWriteParams {
  action: CertificateWriteAction;
  name: string;
  data: string;
  storeType: string;
}

export interface ConfigParams {
  action: ConfigAction;
  baseUrl?: string;
  authToken?: string;
  username?: string;
  password?: string;
  clearAuth?: boolean;
  requireValidUrl?: boolean;
}

// Tool parameter type map
export interface ToolParamMap {
  'read_connections': ConnectionReadParams;
  'write_connections': ConnectionWriteParams;
  'read_jobs': JobReadParams;
  'write_jobs': JobWriteParams;
  'execute_job': {
    jobName?: string;
    jobId?: string;
    waitForResults?: boolean;
    timeout?: number;
  };
  'cancel_job': {
    jobName?: string;
    jobId?: string;
  };
  'read_tasks': TaskReadParams;
  'write_tasks': TaskWriteParams;
  'read_transformations': TransformationReadParams;
  'write_transformations': TransformationWriteParams;
  'read_users': UserReadParams;
  'write_users': UserWriteParams;
  'read_requests': RequestReadParams;
  'write_requests': RequestWriteParams;
  'read_history': HistoryReadParams;
  'read_certificates': CertificateReadParams;
  'write_certificates': CertificateWriteParams;
  'configure_sync_server': ConfigParams;
  'execute_query': {
    jobName?: string;
    jobId?: string;
    queries: string[];
    waitForResults?: boolean;
    timeout?: number;
  };
  'get_connection_tables': {
    connectionName: string;
    tableOrView?: 'TABLES' | 'VIEWS' | 'ALL';
    schema?: string;
    includeCatalog?: boolean;
    includeSchema?: boolean;
    topTable?: number;
    skipTable?: number;
  };
  'get_table_columns': {
    connectionName: string;
    table: string;
  };
  'get_job_tables': {
    connectionName: string;
    jobId: string;
    tableOrView?: 'TABLES' | 'VIEWS' | 'ALL';
    schema?: string;
    includeCatalog?: boolean;
    includeSchema?: boolean;
    topTable?: number;
    skipTable?: number;
  };
}

// Tool result type map
export type ToolResultMap = {
  'read_connections': ConnectionInfo[] | CountResponse | ConnectionInfo | TestConnectionResponse;
  'write_connections': ConnectionInfo | DeleteResponse;
  'read_jobs': JobInfo[] | CountResponse | JobInfo | JobStatusResponse | HistoryInfo[] | JobLogsResponse;
  'write_jobs': JobInfo | DeleteResponse;
  'execute_job': JobExecutionResult[];
  'cancel_job': DeleteResponse;
  'read_tasks': TaskInfo[] | CountResponse | TaskInfo;
  'write_tasks': TaskInfo | DeleteResponse;
  'read_transformations': TransformationInfo[] | CountResponse | TransformationInfo;
  'write_transformations': TransformationInfo | DeleteResponse;
  'read_users': UserInfo[] | CountResponse | UserInfo;
  'write_users': UserInfo | BulkUserCreateResponse;
  'read_requests': RequestInfo[] | CountResponse | RequestInfo;
  'write_requests': DeleteResponse;
  'read_history': HistoryInfo[] | CountResponse;
  'read_certificates': CertificateInfo[];
  'write_certificates': CertificateInfo;
  'configure_sync_server': ConfigurationInfo | ConfigUpdateResponse;
  'execute_query': JobExecutionResult[];
  'get_connection_tables': TableInfo[];
  'get_table_columns': ColumnInfo[];
  'get_job_tables': TableInfo[];
};

// Type guard functions
export function isConnectionReadAction(action: string): action is ConnectionReadAction {
  return ['list', 'count', 'get', 'test'].includes(action);
}

export function isConnectionWriteAction(action: string): action is ConnectionWriteAction {
  return ['create', 'update', 'delete'].includes(action);
}

export function isJobReadAction(action: string): action is JobReadAction {
  return ['list', 'count', 'get', 'status', 'history', 'logs'].includes(action);
}

export function isJobWriteAction(action: string): action is JobWriteAction {
  return ['create', 'update', 'delete'].includes(action);
}

export function isTaskReadAction(action: string): action is TaskReadAction {
  return ['list', 'count', 'get'].includes(action);
}

export function isTaskWriteAction(action: string): action is TaskWriteAction {
  return ['create', 'update', 'delete'].includes(action);
}

export function isTransformationReadAction(action: string): action is TransformationReadAction {
  return ['list', 'count', 'get'].includes(action);
}

export function isTransformationWriteAction(action: string): action is TransformationWriteAction {
  return ['create', 'update', 'delete'].includes(action);
}

export function isUserReadAction(action: string): action is UserReadAction {
  return ['list', 'count', 'get'].includes(action);
}

export function isUserWriteAction(action: string): action is UserWriteAction {
  return ['create', 'update'].includes(action);
}

export function isRequestReadAction(action: string): action is RequestReadAction {
  return ['list', 'count', 'get'].includes(action);
}

export function isRequestWriteAction(action: string): action is RequestWriteAction {
  return ['delete'].includes(action);
}

export function isHistoryReadAction(action: string): action is HistoryReadAction {
  return ['list', 'count'].includes(action);
}

export function isCertificateReadAction(action: string): action is CertificateReadAction {
  return ['list'].includes(action);
}

export function isCertificateWriteAction(action: string): action is CertificateWriteAction {
  return ['create'].includes(action);
}

export function isConfigAction(action: string): action is ConfigAction {
  return ['get', 'update'].includes(action);
}