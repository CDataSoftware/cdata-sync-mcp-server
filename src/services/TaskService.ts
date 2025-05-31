// src/services/TaskService.ts

import { BaseService } from "./BaseService.js";
import { TaskInfo } from "../types/api.js";
import {
  TaskListParams,
  TaskCreateParams,
  TaskUpdateParams,
  TaskDeleteParams
} from "../types/parameters.js";
import {
  DeleteResponse,
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { ITaskService } from "../types/services.js";
import { toIdString } from "../utils/typeConverters.js";
import { assertDefined } from "../utils/typeGuards.js";

export class TaskService extends BaseService implements ITaskService {
  protected getResourceName(): string {
    return 'Task';
  }

  async listTasks(params: TaskListParams = {}): Promise<TaskInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/tasks${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<TaskInfo>>(endpoint);
    return this.extractArray(result);
  }

  async countTasks(params: Pick<TaskListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/tasks/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }

  async getTask(jobName: string, select?: string): Promise<TaskInfo> {
    assertDefined(jobName, "Job name is required for getting task");
    
    const queryParams = new URLSearchParams();
    if (select) queryParams.append("$select", select);
    
    const endpoint = this.buildEntityEndpoint('/tasks', jobName);
    const fullEndpoint = `${endpoint}${queryParams.toString() ? `?${queryParams}` : ""}`;
    
    return this.syncClient.get<TaskInfo>(fullEndpoint);
  }

  async createTask(params: TaskCreateParams): Promise<TaskInfo> {
    assertDefined(params.jobName, "Job name is required for task creation");
    
    // Validate that either query or table is provided
    if (!params.query && !params.table) {
      throw new Error("Either 'query' or 'table' must be provided for task creation");
    }
    
    const taskData: Record<string, any> = {
      JobName: params.jobName,
    };
    
    // For creation, don't include TaskId (it's auto-generated)
    if (params.query) taskData.Query = params.query;
    if (params.table) taskData.Table = params.table;
    if (params.index) taskData.Index = params.index;

    return this.syncClient.post<TaskInfo>("/tasks", taskData);
  }

  async updateTask(params: TaskUpdateParams): Promise<TaskInfo> {
    assertDefined(params.jobName, "Job name is required for task update");
    assertDefined(params.taskId, "Task ID is required for task update");
    
    // CORRECT IMPLEMENTATION: Use PUT /tasks with JobName and TaskId in body
    // TaskId should be sent as string to preserve precision
    const taskData: Record<string, any> = {
      JobName: params.jobName,
      TaskId: toIdString(params.taskId)
    };
    
    // Include only the fields being updated
    if (params.query !== undefined) taskData.Query = params.query;
    if (params.table !== undefined) taskData.Table = params.table;
    // Note: Index might not be updatable, based on the documentation
    
    // Debug logging
    if (process.env.MCP_MODE || process.env.DEBUG_TASKS) {
      console.error("=== TASK UPDATE ===");
      console.error("Endpoint: /tasks");
      console.error("Method: PUT");
      console.error("Body:", JSON.stringify(taskData, null, 2));
      console.error("==================");
    }

    // Use /tasks endpoint (not /tasks('{JobName}'))
    return this.syncClient.put<TaskInfo>("/tasks", taskData);
  }

  async deleteTask(params: TaskDeleteParams): Promise<DeleteResponse> {
    assertDefined(params.jobName, "Job name is required for task deletion");
    assertDefined(params.taskId, "Task ID is required for task deletion");
    
    // CORRECT IMPLEMENTATION: Use DELETE /tasks with query parameters
    // Based on official documentation
    const queryParams = new URLSearchParams();
    queryParams.append("JobName", params.jobName);
    queryParams.append("TaskId", toIdString(params.taskId));
    
    const endpoint = `/tasks?${queryParams.toString()}`;
    
    if (process.env.MCP_MODE || process.env.DEBUG_TASKS) {
      console.error("=== TASK DELETE ===");
      console.error("Endpoint:", endpoint);
      console.error("Method: DELETE");
      console.error("==================");
    }
    
    await this.syncClient.delete(endpoint);
    return { success: true, message: "Task deleted successfully" };
  }

  async getTaskProperty(jobName: string, propertyName: string): Promise<string> {
    assertDefined(jobName, "Job name is required");
    assertDefined(propertyName, "Property name is required");
    
    const endpoint = this.buildEntityEndpoint('/tasks', jobName);
    return this.getProperty(endpoint, propertyName);
  }

  // Additional method to create task using the alternate endpoint
  async createTaskAlternate(params: TaskCreateParams): Promise<TaskInfo> {
    assertDefined(params.jobName, "Job name is required");
    
    // This uses the PUT /tasks('{JobName}') endpoint which also creates tasks
    const taskData: Record<string, any> = {};
    
    if (params.query) taskData.Query = params.query;
    if (params.table) taskData.Table = params.table;
    if (params.index) taskData.Index = params.index;

    if (process.env.MCP_MODE || process.env.DEBUG_TASKS) {
      console.error("=== CREATE TASK (Alternate) ===");
      console.error("Using PUT /tasks('{JobName}') endpoint");
      console.error("This also creates new tasks");
    }

    const endpoint = this.buildEntityEndpoint('/tasks', params.jobName);
    return this.syncClient.put<TaskInfo>(endpoint, taskData);
  }

  // Helper method to find task by ID with proper string handling
  async getTaskByJobAndId(jobName: string, taskId: string): Promise<TaskInfo | null> {
    try {
      // Get all tasks for the job
      const tasks = await this.listTasks({ 
        filter: `JobName eq '${jobName}' and TaskId eq '${taskId}'` 
      });
      
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error) {
      console.error(`Failed to find task ${taskId} in job ${jobName}:`, error);
      return null;
    }
  }

  // Replacement method for task updates using delete + create
  async replaceTask(params: {
    jobName: string;
    taskId: string;
    query?: string;
    table?: string;
    index?: string;
  }): Promise<TaskInfo> {
    // Step 1: Get the existing task
    const existingTask = await this.getTaskByJobAndId(params.jobName, params.taskId);
    
    if (!existingTask) {
      throw new Error(`Task ${params.taskId} not found in job ${params.jobName}`);
    }
    
    // Step 2: Delete the existing task
    await this.deleteTask({
      jobName: params.jobName,
      taskId: params.taskId
    });
    
    // Step 3: Create replacement task with same or updated values
    return this.createTask({
      jobName: params.jobName,
      index: params.index || existingTask.Index,
      query: params.query || existingTask.Query, 
      table: params.table || existingTask.Table
    });
  }
}