// src/types/api.ts
export interface JobExecutionResult {
  JobName: string;
  Status: string;
  Query: string;
  Result: string;
  Detail: string;
  RunStartDate: string;
}

export interface ConnectionInfo {
  Name: string;
  ProviderName: string;
  ProviderClass?: string;
  ConnectionString: string;
  ConnectionState: string;
  LastTested: string;
  CreationTime?: string;
  LastModified?: string;
  Verbosity?: string;
  LicenseState?: string;
  LicenseMessage?: string;
  CanUpdate?: string;
  CanRemove?: string;
}

export interface JobInfo {
  JobId: string;  // Changed from string (was already string)
  JobName: string;
  Source: string;
  Destination: string;
  Status: string;
  Scheduled: string;
  ScheduledCron?: string;
  Verbosity?: string;
  Type?: string;
  CanUpdate?: string;
  CanRemove?: string;
  CanExecute?: string;
}

export interface TaskInfo {
  TaskId: string;  // Changed from number to string
  JobName: string;
  JobId: string;
  Index: string;
  Query: string;
  Table: string;
  RowVersion: string;
}

export interface TransformationInfo {
  TransformationId: string;  // Already string
  TransformationName: string;
  Connection: string;
  TransformationTriggerMode?: string;
  TriggerAfterJob?: string;
  TriggerAfterJobId?: string;
  Verbosity?: string;
  Type?: string;
  CanUpdate?: string;
  CanRemove?: string;
  CanExecute?: string;
}

export interface UserInfo {
  User: string;
  UserId: string;  // Already string
  Roles: string;
  Active: string;
  FederationId?: string;
  LicenseState?: string;
  LicenseMessage?: string;
}

export interface RequestInfo {
  Id: string;  // Already string
  Timestamp: string;
  URL: string;
  Method: string;
  User: string;
  RemoteIP: string;
  Status: string;
  Error?: string;
}

export interface HistoryInfo {
  JobId: string;
  JobName: string;
  RunStartDate: string;
  Status: string;
  Details: string;
  Runtime: string;
  RecordsAffected: string;
  LogFile: string;
  Id: string;  // Changed from number to string
  InstanceId: string;
}

export interface CertificateInfo {
  Name: string;
  Data: string;
  StoreType: string;
  Subject?: string;
  Issuer?: string;
  IssuedTo?: string;
  IssuedBy?: string;
  EffectiveDate?: string;
  ExpirationDate?: string;
  ExpirationDays?: string;  // Changed from number to string
  Serialnumber?: string;
  Thumbprint?: string;
  Keysize?: string;
  SignatureAlgorithm?: string;
  ConnectorIds?: string;
}

export interface WorkspaceInfo {
  Id: string;
  Name: string;
}

export interface CDataError {
  error: {
    code: string;
    message: string;
  };
}