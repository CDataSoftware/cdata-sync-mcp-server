// src/services/WorkspaceService.ts

import { BaseService } from "./BaseService.js";
import { WorkspaceInfo } from "../types/api.js";
import {
  WorkspaceListParams,
  WorkspaceCreateParams,
  WorkspaceUpdateParams
} from "../types/parameters.js";
import {
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { IWorkspaceService } from "../types/services.js";
import { assertDefined } from "../utils/typeGuards.js";

export class WorkspaceService extends BaseService implements IWorkspaceService {
  protected getResourceName(): string {
    return 'Workspace';
  }

  async listWorkspaces(params: WorkspaceListParams = {}): Promise<WorkspaceInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/workspaces${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<WorkspaceInfo>>(endpoint);
    return this.extractArray(result);
  }

  async countWorkspaces(params: Pick<WorkspaceListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/workspaces/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }

  async getWorkspaceById(id: string): Promise<WorkspaceInfo> {
    assertDefined(id, "Workspace ID is required");
    
    // Use the cleaner endpoint that requires ID in body
    return this.syncClient.makeRequest<WorkspaceInfo>('/workspaces', "GET", { Id: id });
  }

  async getWorkspaceByName(name: string): Promise<WorkspaceInfo> {
    assertDefined(name, "Workspace name is required");
    
    // For now, keep the original implementation since we need to look up by name
    // This could be optimized by maintaining a name->ID cache or using a filter
    const endpoint = this.buildEntityEndpoint('/workspaces', name);
    return this.syncClient.get<WorkspaceInfo>(endpoint);
  }

  async createWorkspace(params: WorkspaceCreateParams): Promise<WorkspaceInfo> {
    assertDefined(params.name, "Workspace name is required");
    
    const workspaceData: Record<string, any> = {
      Name: params.name
    };

    return this.syncClient.post<WorkspaceInfo>("/workspaces", workspaceData);
  }

  async updateWorkspaceById(id: string, newName: string): Promise<WorkspaceInfo> {
    assertDefined(id, "Workspace ID is required for update");
    assertDefined(newName, "New workspace name is required");
    
    // Use the simpler endpoint that requires ID and Name in body
    return this.syncClient.makeRequest<WorkspaceInfo>('/workspaces', "PUT", { 
      Id: id, 
      Name: newName 
    });
  }

  async updateWorkspace(params: WorkspaceUpdateParams): Promise<WorkspaceInfo> {
    assertDefined(params.name, "Workspace name is required for update");
    assertDefined(params.newName, "New workspace name is required for update");
    
    // First, get the workspace to find its ID
    const workspace = await this.getWorkspaceByName(params.name);
    
    // Then update using the ID
    return this.updateWorkspaceById(workspace.Id, params.newName);
  }

  async deleteWorkspaceById(id: string): Promise<void> {
    assertDefined(id, "Workspace ID is required for deletion");
    
    // Use the simpler endpoint that only requires ID in body
    await this.syncClient.makeRequest('/workspaces', "DELETE", { Id: id });
  }

  async deleteWorkspace(name: string): Promise<void> {
    assertDefined(name, "Workspace name is required for deletion");
    
    // First, get the workspace to find its ID
    const workspace = await this.getWorkspaceByName(name);
    
    // Then delete using the ID
    await this.deleteWorkspaceById(workspace.Id);
  }

  async getWorkspaceProperty(name: string, propertyName: string): Promise<string> {
    assertDefined(name, "Workspace name is required");
    assertDefined(propertyName, "Property name is required");
    
    const endpoint = this.buildEntityEndpoint('/workspaces', name);
    return this.getProperty(endpoint, propertyName);
  }
}