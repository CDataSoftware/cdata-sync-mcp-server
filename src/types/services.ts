// src/types/services.ts

import { 
  ConnectionInfo, JobInfo, TaskInfo, TransformationInfo, 
  UserInfo, RequestInfo, HistoryInfo, CertificateInfo, WorkspaceInfo 
} from './api.js';

import {
  ConnectionListParams, ConnectionTestParams,
  ConnectionCreateParams, ConnectionUpdateParams, ConnectionDeleteParams,
  JobListParams, JobStatusParams, JobHistoryParams,
  JobLogsParams, JobCreateParams, JobUpdateParams, JobDeleteParams,
  JobExecuteParams, JobCancelParams, ExecuteQueryParams,
  TaskListParams, TaskCreateParams, TaskUpdateParams, TaskDeleteParams,
  TransformationListParams, TransformationCreateParams,
  TransformationUpdateParams, TransformationDeleteParams,
  UserListParams, UserCreateParams, UserBulkCreateParams, UserUpdateParams,
  RequestListParams, RequestDeleteParams,
  HistoryListParams, CertificateListParams, CertificateCreateParams,
  GetConnectionTablesParams, GetTableColumnsParams, GetJobTablesParams,
  WorkspaceListParams, WorkspaceCreateParams, WorkspaceUpdateParams,
  ConfigUpdateParams,
  HttpMethod
} from './parameters.js';

import {
  DeleteResponse, TestConnectionResponse, JobExecutionResult, JobStatusResponse,
  JobLogsResponse, TableInfo, ColumnInfo, BulkUserCreateResponse,
  ConfigurationInfo, ConfigUpdateResponse, CountResponse
} from './responses.js';

import { CDataConfig } from './config.js';

// Connection Service Interface
export interface IConnectionService {
  listConnections(params?: ConnectionListParams): Promise<ConnectionInfo[]>;
  countConnections(params?: Pick<ConnectionListParams, 'filter'>): Promise<CountResponse>;
  getConnection(name: string): Promise<ConnectionInfo>;
  testConnection(params: ConnectionTestParams): Promise<TestConnectionResponse>;
  createConnection(params: ConnectionCreateParams): Promise<ConnectionInfo>;
  updateConnection(params: ConnectionUpdateParams): Promise<ConnectionInfo>;
  deleteConnection(params: ConnectionDeleteParams): Promise<DeleteResponse>;
  getConnectionTables(params: GetConnectionTablesParams): Promise<TableInfo[]>;
  getTableColumns(params: GetTableColumnsParams): Promise<ColumnInfo[]>;
}

// Job Service Interface
export interface IJobService {
  listJobs(params?: JobListParams): Promise<JobInfo[]>;
  countJobs(params?: Pick<JobListParams, 'filter'>): Promise<CountResponse>;
  getJob(jobName: string): Promise<JobInfo>;
  createJob(params: JobCreateParams): Promise<JobInfo>;
  updateJob(params: JobUpdateParams): Promise<JobInfo>;
  deleteJob(params: JobDeleteParams): Promise<DeleteResponse>;
  executeJob(params: JobExecuteParams): Promise<JobExecutionResult[]>;
  cancelJob(params: JobCancelParams): Promise<DeleteResponse>;
  getJobStatus(params: JobStatusParams): Promise<JobStatusResponse>;
  getJobHistory(params?: JobHistoryParams): Promise<HistoryInfo[]>;
  getJobLogs(params: JobLogsParams): Promise<JobLogsResponse>;
  executeQuery(params: ExecuteQueryParams): Promise<JobExecutionResult[]>;
  getJobTables(params: GetJobTablesParams): Promise<TableInfo[]>;
}

// Task Service Interface
export interface ITaskService {
  listTasks(params?: TaskListParams): Promise<TaskInfo[]>;
  countTasks(params?: Pick<TaskListParams, 'filter'>): Promise<CountResponse>;
  getTask(jobName: string, select?: string): Promise<TaskInfo>;
  createTask(params: TaskCreateParams): Promise<TaskInfo>;
  updateTask(params: TaskUpdateParams): Promise<TaskInfo>;
  deleteTask(params: TaskDeleteParams): Promise<DeleteResponse>;
}

// Transformation Service Interface
export interface ITransformationService {
  listTransformations(params?: TransformationListParams): Promise<TransformationInfo[]>;
  countTransformations(params?: Pick<TransformationListParams, 'filter'>): Promise<CountResponse>;
  getTransformation(transformationName: string): Promise<TransformationInfo>;
  createTransformation(params: TransformationCreateParams): Promise<TransformationInfo>;
  updateTransformation(params: TransformationUpdateParams): Promise<TransformationInfo>;
  deleteTransformation(params: TransformationDeleteParams): Promise<DeleteResponse>;
}

// User Service Interface
export interface IUserService {
  listUsers(params?: UserListParams): Promise<UserInfo[]>;
  countUsers(params?: Pick<UserListParams, 'filter'>): Promise<CountResponse>;
  getUser(user: string): Promise<UserInfo>;
  createUser(params: UserCreateParams): Promise<UserInfo>;
  createUsers(params: UserBulkCreateParams): Promise<BulkUserCreateResponse>;
  updateUser(params: UserUpdateParams): Promise<UserInfo>;
}

// Request Service Interface
export interface IRequestService {
  listRequests(params?: RequestListParams): Promise<RequestInfo[]>;
  countRequests(params?: Pick<RequestListParams, 'filter'>): Promise<CountResponse>;
  getRequest(id: string): Promise<RequestInfo>;
  deleteRequest(params: RequestDeleteParams): Promise<DeleteResponse>;
}

// History Service Interface
export interface IHistoryService {
  listHistory(params?: HistoryListParams): Promise<HistoryInfo[]>;
  countHistory(params?: Pick<HistoryListParams, 'filter'>): Promise<CountResponse>;
}

// Certificate Service Interface
export interface ICertificateService {
  listCertificates(params?: CertificateListParams): Promise<CertificateInfo[]>;
  createCertificate(params: CertificateCreateParams): Promise<CertificateInfo>;
}

// Workspace Service Interface
export interface IWorkspaceService {
  listWorkspaces(params?: WorkspaceListParams): Promise<WorkspaceInfo[]>;
  countWorkspaces(params?: Pick<WorkspaceListParams, 'filter'>): Promise<CountResponse>;
  getWorkspaceByName(name: string): Promise<WorkspaceInfo>;
  createWorkspace(params: WorkspaceCreateParams): Promise<WorkspaceInfo>;
  updateWorkspace(params: WorkspaceUpdateParams): Promise<WorkspaceInfo>;
  deleteWorkspace(name: string): Promise<void>;
  getWorkspaceProperty(name: string, propertyName: string): Promise<string>;
}

// Sync Config Service Interface
export interface ISyncConfigService {
  getCurrentConfig(): Promise<ConfigurationInfo>;
  updateConfig(params: ConfigUpdateParams): Promise<ConfigUpdateResponse>;
  getConfig(): CDataConfig;
}

// API Client Interface
export interface ICDataSyncApiClient {
  makeRequest<T = any>(
    endpoint: string,
    method?: HttpMethod,
    data?: any
  ): Promise<T>;
}