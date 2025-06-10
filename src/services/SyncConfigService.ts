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
    const hasAuth = this.config.authToken || (this.config.username && this.config.password);
    
    return {
      baseUrl: this.config.baseUrl || '',
      authType: this.config.authToken ? 'token' : (this.config.username ? 'basic' : 'none'),
      username: this.config.username || undefined,
      hasPassword: !!this.config.password,
      hasAuthToken: !!this.config.authToken,
      isConfigured: !!hasAuth
    };
  }

  async updateConfig(params: ConfigUpdateParams): Promise<ConfigUpdateResponse> {
    // Validate inputs
    if (params.baseUrl !== undefined && params.baseUrl !== '' && !isValidUrl(params.baseUrl)) {
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
      let url = params.baseUrl.trim();
      if (url === '') {
        // Allow empty baseUrl
        newConfig.baseUrl = '';
      } else {
        // Ensure non-empty URLs end with /api.rsc
        if (!url.endsWith('/api.rsc')) {
          if (!url.endsWith('/')) {
            url += '/';
          }
          url += 'api.rsc';
        }
        newConfig.baseUrl = url;
      }
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

    // Test the new configuration only if baseUrl is provided
    if (newConfig.baseUrl) {
      try {
        const testClient = new CDataSyncApiClient(newConfig);
        const testResult = await testClient.get<any>("/connections/$count");
        
        // If test succeeds, update the config
        this.config = newConfig;
        
        // Notify about config change
        if (this.onConfigChange) {
          this.onConfigChange(newConfig);
        }

        return {
          success: true,
          message: `Configuration updated and tested successfully. Connected to CData Sync at ${newConfig.baseUrl}`,
          testResult: { connectionCount: testResult }
        };
      } catch (error: any) {
        // Test failed, but still update config if it's structurally valid
        // This allows users to configure the server even when CData Sync is down
        this.config = newConfig;
        
        // Notify about config change
        if (this.onConfigChange) {
          this.onConfigChange(newConfig);
        }

        let warningMessage = "Configuration updated, but connection test failed: ";
        
        if (error.response?.status === 401) {
          warningMessage += "Authentication failed. Please verify credentials.";
        } else if (error.response?.status === 404) {
          warningMessage += "API endpoint not found. Please verify the base URL.";
        } else if (error.code === 'ECONNREFUSED') {
          warningMessage += "Connection refused. CData Sync may not be running.";
        } else if (error.code === 'ENOTFOUND') {
          warningMessage += "Host not found. Please verify the base URL.";
        } else {
          warningMessage += error.message;
        }

        return {
          success: true, // Configuration was updated successfully
          message: `${warningMessage} The configuration has been saved and will be used for future requests.`
        };
      }
    } else {
      // No baseUrl provided or baseUrl is empty
      this.config = newConfig;
      
      // Notify about config change
      if (this.onConfigChange) {
        this.onConfigChange(newConfig);
      }

      return {
        success: true,
        message: "Configuration updated successfully. No base URL set - CData Sync connection disabled."
      };
    }
  }

  getConfig(): CDataConfig {
    return { ...this.config };
  }

  // Check if the current configuration is sufficient for API calls
  isConfigured(): boolean {
    const hasAuth = this.config.authToken || (this.config.username && this.config.password);
    // Allow empty baseUrl, only check for auth
    return !!hasAuth;
  }

  // Get a helpful configuration error message
  getConfigurationError(): string {
    const hasAuth = this.config.authToken || (this.config.username && this.config.password);
    if (!hasAuth) {
      return "Authentication is not configured. Use configure_sync_server to set either authToken or username/password.";
    }

    if (this.config.username && !this.config.password) {
      return "Incomplete basic authentication. Password is required when using username.";
    }

    if (!this.config.baseUrl) {
      return "Base URL is not configured. Use configure_sync_server to set the CData Sync API URL.";
    }

    return "Configuration appears valid.";
  }

  private validateConfig(config: CDataConfig): { valid: boolean; message: string } {
    // Allow empty baseUrl - don't require it for validation
    // This enables users to configure in steps or use without a base URL

    // Don't require authentication for validation - allow saving incomplete config
    // This enables users to configure in steps

    if (config.username && !config.password) {
      return { valid: false, message: "Password is required when using basic authentication" };
    }

    return { valid: true, message: "Configuration is valid" };
  }
}