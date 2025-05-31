// src/services/SyncConfigService.ts

import { CDataConfig } from "../types/config.js";
import { CDataSyncApiClient } from "../api/CDataSyncApiClient.js";
import { ConfigUpdateParams } from "../types/parameters.js";
import { ConfigurationInfo, ConfigUpdateResponse } from "../types/responses.js";
import { ISyncConfigService } from "../types/services.js";
import { isValidUrl } from "../utils/typeGuards.js";

export class SyncConfigService implements ISyncConfigService {
  private config: CDataConfig;
  private onConfigChange: ((newConfig: CDataConfig) => void) | undefined;

  constructor(initialConfig: CDataConfig, onConfigChange?: (newConfig: CDataConfig) => void) {
    this.config = { ...initialConfig };
    this.onConfigChange = onConfigChange;
  }

  async getCurrentConfig(): Promise<ConfigurationInfo> {
    return {
      baseUrl: this.config.baseUrl,
      authType: this.config.authToken ? 'token' : (this.config.username ? 'basic' : 'none'),
      username: this.config.username || undefined,
      hasPassword: !!this.config.password,
      hasAuthToken: !!this.config.authToken,
      isConfigured: !!(this.config.baseUrl && (this.config.authToken || (this.config.username && this.config.password)))
    };
  }

  async updateConfig(params: ConfigUpdateParams): Promise<ConfigUpdateResponse> {
    // Validate inputs
    if (params.baseUrl && !isValidUrl(params.baseUrl)) {
      return { 
        success: false, 
        message: "Invalid base URL format. Must be a valid HTTP/HTTPS URL." 
      };
    }

    // Validate auth token if provided
    if (params.authToken !== undefined && params.authToken.length < 10) {
      return {
        success: false,
        message: "Auth token must be at least 10 characters long"
      };
    }

    // Validate password if provided
    if (params.password !== undefined && params.password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long"
      };
    }

    // Create new config
    const newConfig: CDataConfig = { ...this.config };

    // Update base URL if provided
    if (params.baseUrl !== undefined) {
      // Ensure it ends with /api.rsc
      let url = params.baseUrl.trim();
      if (!url.endsWith('/api.rsc')) {
        if (!url.endsWith('/')) {
          url += '/';
        }
        url += 'api.rsc';
      }
      newConfig.baseUrl = url;
    }

    // Handle authentication updates
    if (params.clearAuth) {
      // Clear all auth
      delete newConfig.authToken;
      delete newConfig.username;
      delete newConfig.password;
    } else {
      // Update auth based on what's provided
      if (params.authToken !== undefined) {
        // Token auth takes precedence
        newConfig.authToken = params.authToken;
        // Clear basic auth when setting token
        delete newConfig.username;
        delete newConfig.password;
      } else if (params.username !== undefined || params.password !== undefined) {
        // Basic auth
        if (params.username !== undefined) newConfig.username = params.username;
        if (params.password !== undefined) newConfig.password = params.password;
        // Clear token when setting basic auth
        delete newConfig.authToken;
      }
    }

    // Validate final configuration
    const validationResult = this.validateConfig(newConfig);
    if (!validationResult.valid) {
      return { 
        success: false, 
        message: validationResult.message 
      };
    }

    // Test the new configuration
    try {
      const testClient = new CDataSyncApiClient(newConfig);
      const testResult = await testClient.get<any>("/connections");
      
      // If test succeeds, update the config
      this.config = newConfig;
      
      // Notify about config change
      if (this.onConfigChange) {
        this.onConfigChange(newConfig);
      }

      return {
        success: true,
        message: `Configuration updated successfully. Connected to CData Sync at ${newConfig.baseUrl}`,
        testResult: { connectionCount: testResult }
      };
    } catch (error: any) {
      // Test failed, don't update config
      let errorMessage = "Failed to connect with new configuration: ";
      
      if (error.response?.status === 401) {
        errorMessage += "Authentication failed. Check credentials.";
      } else if (error.response?.status === 404) {
        errorMessage += "API endpoint not found. Check base URL.";
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage += "Connection refused. Check if CData Sync is running.";
      } else {
        errorMessage += error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  getConfig(): CDataConfig {
    return { ...this.config };
  }

  private validateConfig(config: CDataConfig): { valid: boolean; message: string } {
    if (!config.baseUrl) {
      return { valid: false, message: "Base URL is required" };
    }

    const hasAuth = config.authToken || (config.username && config.password);
    if (!hasAuth) {
      return { valid: false, message: "Authentication is required. Provide either authToken or username/password." };
    }

    if (!config.authToken && config.username && !config.password) {
      return { valid: false, message: "Password is required when using basic authentication" };
    }

    return { valid: true, message: "Configuration is valid" };
  }
}