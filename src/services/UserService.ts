// src/services/UserService.ts

import { BaseService } from "./BaseService.js";
import { UserInfo } from "../types/api.js";
import {
  UserListParams,
  UserCreateParams,
  UserBulkCreateParams,
  UserUpdateParams,
  UserRole
} from "../types/parameters.js";
import {
  BulkUserCreateResponse,
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { IUserService } from "../types/services.js";
import { toBoolean, toUserRole } from "../utils/typeConverters.js";
import { assertDefined } from "../utils/typeGuards.js";

export class UserService extends BaseService implements IUserService {
  protected getResourceName(): string {
    return 'User';
  }

  async listUsers(params: UserListParams = {}): Promise<UserInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/users${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<UserInfo>>(endpoint);
    return this.extractArray(result);
  }

  async countUsers(params: Pick<UserListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/users/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }

  async getUser(user: string): Promise<UserInfo> {
    assertDefined(user, "Username is required");
    
    const endpoint = this.buildEntityEndpoint('/users', user);
    return this.syncClient.get<UserInfo>(endpoint);
  }

  async createUser(params: UserCreateParams): Promise<UserInfo> {
    assertDefined(params.user, "Username is required");
    assertDefined(params.password, "Password is required");
    assertDefined(params.roles, "User role is required");
    
    const userData: Record<string, any> = {
      User: params.user,
      Password: params.password,
      Roles: this.mapRole(params.roles),
    };

    if (params.active !== undefined) {
      userData.Active = toBoolean(params.active);
    }
    if (params.federationId) {
      userData.FederationId = params.federationId;
    }

    // Debug logging
    if (process.env.MCP_MODE || process.env.DEBUG_USERS) {
      console.error("=== CREATE SINGLE USER DEBUG ===");
      console.error("Input params:", JSON.stringify(params, null, 2));
      console.error("Prepared userData:", JSON.stringify(userData, null, 2));
      console.error("================================");
    }

    return this.syncClient.post<UserInfo>("/users", userData);
  }

  async createUsers(params: UserBulkCreateParams): Promise<BulkUserCreateResponse> {
    assertDefined(params.users, "Users array is required");
    
    if (!Array.isArray(params.users) || params.users.length === 0) {
      throw new Error("Users array cannot be empty");
    }
    
    const requestData: Record<string, any> = {};
    
    // Debug logging
    if (process.env.MCP_MODE || process.env.DEBUG_USERS) {
      console.error("=== CREATE MULTIPLE USERS DEBUG ===");
      console.error("Input params:", JSON.stringify(params, null, 2));
    }
    
    // Convert array format to numbered format expected by API
    params.users.forEach((user, index) => {
      // Validation: Check required fields
      if (!user.user || !user.password) {
        throw new Error(`User at index ${index} is missing required 'user' or 'password' field`);
      }

      const suffix = `#${index + 1}`;
      requestData[`User${suffix}`] = user.user;
      requestData[`Password${suffix}`] = user.password;
      if (user.roles) {
        requestData[`Roles${suffix}`] = this.mapRole(user.roles);
      }
      if (user.federationId) {
        requestData[`FederationId${suffix}`] = user.federationId;
      }
      // Convert boolean to string as required by API
      requestData[`Active${suffix}`] = user.active !== false ? "true" : "false";
    });

    // Debug logging
    if (process.env.MCP_MODE || process.env.DEBUG_USERS) {
      console.error("Prepared requestData:", JSON.stringify(requestData, null, 2));
      console.error("===================================");
    }

    await this.syncClient.post<any>("/createUsers", requestData);
    
    // Transform result to standard response format
    return {
      success: true,
      message: `Created ${params.users.length} users successfully`,
      created: params.users.length,
      failed: 0
    };
  }

  async updateUser(params: UserUpdateParams): Promise<UserInfo> {
    assertDefined(params.user, "Username is required for update");
    
    const userData: Record<string, any> = {};
    
    if (params.user) userData.User = params.user; // User name can be updated
    if (params.password) userData.Password = params.password;
    if (params.roles) userData.Roles = this.mapRole(params.roles);
    if (params.active !== undefined) userData.Active = toBoolean(params.active);
    if (params.expiredIn !== undefined) userData.ExpiredIn = params.expiredIn;
    if (params.federationId !== undefined) userData.FederationId = params.federationId;

    // Validation: Check that at least one field is being updated
    const fieldsToUpdate = Object.keys(userData).filter(key => key !== 'User');
    if (fieldsToUpdate.length === 0) {
      throw new Error("At least one field must be provided for update");
    }

    const endpoint = this.buildEntityEndpoint('/users', params.user);
    return this.syncClient.put<UserInfo>(endpoint, userData);
  }

  async getUserProperty(user: string, propertyName: string): Promise<string> {
    assertDefined(user, "Username is required");
    assertDefined(propertyName, "Property name is required");
    
    const endpoint = this.buildEntityEndpoint('/users', user);
    return this.getProperty(endpoint, propertyName);
  }

  // Helper method to map role names to API format
  private mapRole(role: UserRole | string): string {
    // If it's already in the correct format, return as-is
    if (this.isValidApiRole(role)) {
      return role;
    }
    
    // Otherwise, try to convert it
    try {
      return toUserRole(role);
    } catch {
      // If conversion fails, return as-is and let the API handle validation
      return role;
    }
  }

  private isValidApiRole(role: string): boolean {
    const validRoles: UserRole[] = [
      'cdata_admin', 
      'cdata_standard', 
      'cdata_job_creator', 
      'cdata_support'
    ];
    return validRoles.includes(role as UserRole);
  }
}