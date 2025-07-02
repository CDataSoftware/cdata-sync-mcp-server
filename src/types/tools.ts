// src/types/tools.ts

import {
  ConnectionReadAction, ConnectionWriteAction, JobReadAction, JobWriteAction,
  TaskReadAction, TaskWriteAction, TransformationReadAction, TransformationWriteAction,
  UserReadAction, UserWriteAction, RequestReadAction, RequestWriteAction,
  HistoryReadAction, CertificateReadAction, CertificateWriteAction, 
  WorkspaceReadAction, WorkspaceWriteAction, ConfigAction,
  VerbosityLevel, UserRole, JobType, TransformationTriggerMode
} from './parameters.js';

import {
  ConnectionInfo, JobInfo, TaskInfo, TransformationInfo, UserInfo,
  RequestInfo, HistoryInfo, CertificateInfo, WorkspaceInfo
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
  workspaceId?: string;
}

export interface ConnectionWriteParams {
  action: ConnectionWriteAction;
  name: string;
  providerName?: string;
  connectionString?: string;
  verbosity?: VerbosityLevel;
  requireExplicitConnectionString?: boolean;
  workspaceId?: string;
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
  workspaceId?: string;
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
  workspaceId?: string;
  [key: string]: any; // For other job parameters
}

export interface TaskReadParams {
  action: TaskReadAction;
  jobName?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  workspaceId?: string;
}

export interface TaskWriteParams {
  action: TaskWriteAction;
  jobName: string;
  taskId?: string;
  query?: string;
  table?: string;
  index?: string;
  workspaceId?: string;
}

export interface TransformationReadParams {
  action: TransformationReadAction;
  transformationName?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  workspaceId?: string;
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
  workspaceId?: string;
  [key: string]: any; // For other transformation parameters
}

export interface UserReadParams {
  action: UserReadAction;
  user?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  workspaceId?: string;
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
  workspaceId?: string;
}

export interface RequestReadParams {
  action: RequestReadAction;
  id?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  workspaceId?: string;
}

export interface RequestWriteParams {
  action: RequestWriteAction;
  id: string;
  workspaceId?: string;
}

export interface HistoryReadParams {
  action: HistoryReadAction;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  orderby?: string;
  workspaceId?: string;
}

export interface CertificateReadParams {
  action: CertificateReadAction;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  workspaceId?: string;
}

export interface CertificateWriteParams {
  action: CertificateWriteAction;
  name: string;
  data: string;
  storeType: string;
  workspaceId?: string;
}

export interface WorkspaceReadParams {
  action: WorkspaceReadAction;
  name?: string;
  id?: string;
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
}

export interface WorkspaceWriteParams {
  action: WorkspaceWriteAction;
  name?: string;
  id?: string;
  newName?: string;
}

export interface ConfigParams {
  action: ConfigAction;
  baseUrl?: string;
  authToken?: string;
  username?: string;
  password?: string;
  clearAuth?: boolean;
  requireValidUrl?: boolean;
  workspace?: string;
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
    workspaceId?: string;
  };
  'cancel_job': {
    jobName?: string;
    jobId?: string;
    workspaceId?: string;
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
  'read_workspaces': WorkspaceReadParams;
  'write_workspaces': WorkspaceWriteParams;
  'configure_sync_server': ConfigParams;
  'execute_query': {
    jobName?: string;
    jobId?: string;
    queries: string[];
    waitForResults?: boolean;
    timeout?: number;
    workspaceId?: string;
  };
  'get_connection_tables': {
    connectionName: string;
    tableOrView?: 'TABLES' | 'VIEWS' | 'ALL';
    schema?: string;
    includeCatalog?: boolean;
    includeSchema?: boolean;
    topTable?: number;
    skipTable?: number;
    workspaceId?: string;
  };
  'get_table_columns': {
    connectionName: string;
    table: string;
    workspaceId?: string;
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
    workspaceId?: string;
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
  'read_workspaces': WorkspaceInfo[] | CountResponse | WorkspaceInfo;
  'write_workspaces': WorkspaceInfo | DeleteResponse;
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

export function isWorkspaceReadAction(action: string): action is WorkspaceReadAction {
  return ['list', 'count', 'get'].includes(action);
}

export function isWorkspaceWriteAction(action: string): action is WorkspaceWriteAction {
  return ['create', 'update', 'delete'].includes(action);
}

export function isConfigAction(action: string): action is ConfigAction {
  return ['get', 'update'].includes(action);
}