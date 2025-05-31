// src/services/RequiredParameterValidation.ts

// Define required parameters for each tool/action combination
export const REQUIRED_PARAMETERS: Record<string, Record<string, string[]>> = {
  write_connections: {
    create: ['name', 'providerName', 'connectionString'],
    update: ['name'],  // connectionString optional for update
    delete: ['name']
  },
  write_jobs: {
    create: ['jobName', 'source', 'destination'],
    update: ['jobName'],
    delete: ['jobName']
  },
  write_tasks: {
    create: ['jobName'],  // either 'query' or 'table' required, but checked separately
    update: ['jobName', 'taskId'],
    delete: ['jobName', 'taskId']
  },
  write_transformations: {
    create: ['transformationName', 'connection'],
    update: ['transformationName'],
    delete: ['transformationName']
  },
  write_users: {
    create: ['user', 'password', 'roles'],  // or 'users' array
    update: ['user']
  },
  execute_job: {
    execute: []  // requires either 'jobName' or 'jobId'
  },
  execute_query: {
    execute: ['queries']  // plus either 'jobName' or 'jobId'
  },
  configure_sync_server: {
    update: []  // requires at least one of: baseUrl, authToken, username/password
  }
};

export function validateRequiredParameters(
  toolName: string, 
  action: string, 
  params: any
): { valid: boolean; missingParams: string[] } {
  
  const toolParams = REQUIRED_PARAMETERS[toolName];
  if (!toolParams) {
    // Tool doesn't have required parameter validation
    return { valid: true, missingParams: [] };
  }
  
  const requiredParams = toolParams[action] || [];
  const missingParams: string[] = [];
  
  // Check standard required parameters
  for (const param of requiredParams) {
    if (params[param] === undefined || params[param] === null || params[param] === '') {
      missingParams.push(param);
    }
  }
  
  // Special case validations
  
  // Tasks: need either query or table for create
  if (toolName === 'write_tasks' && action === 'create') {
    if (!params.query && !params.table) {
      missingParams.push('query OR table');
    }
  }
  
  // Jobs/queries: need either jobName or jobId
  if ((toolName === 'execute_job' || toolName === 'execute_query') && 
      !params.jobName && !params.jobId) {
    missingParams.push('jobName OR jobId');
  }
  
  // Users: for create, need either single user params or users array
  if (toolName === 'write_users' && action === 'create') {
    if (!params.user && !params.users) {
      missingParams.push('user OR users array');
    }
    
    // If users array provided, validate each user
    if (params.users && Array.isArray(params.users)) {
      params.users.forEach((user: any, index: number) => {
        if (!user.user) missingParams.push(`users[${index}].user`);
        if (!user.password) missingParams.push(`users[${index}].password`);
        if (!user.roles) missingParams.push(`users[${index}].roles`);
      });
    }
  }
  
  // Config update: need at least one parameter to update
  if (toolName === 'configure_sync_server' && action === 'update') {
    const hasUpdate = params.baseUrl || params.authToken || 
                     (params.username && params.password) || params.clearAuth;
    if (!hasUpdate) {
      missingParams.push('baseUrl, authToken, OR username/password');
    }
  }
  
  return {
    valid: missingParams.length === 0,
    missingParams
  };
}