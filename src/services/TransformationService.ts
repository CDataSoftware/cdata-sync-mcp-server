// src/services/TransformationService.ts

import { BaseService } from "./BaseService.js";
import { TransformationInfo } from "../types/api.js";
import {
  TransformationListParams,
  TransformationCreateParams,
  TransformationUpdateParams,
  TransformationDeleteParams
} from "../types/parameters.js";
import {
  DeleteResponse,
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { ITransformationService } from "../types/services.js";
import { toBooleanString } from "../utils/typeConverters.js";
import { assertDefined } from "../utils/typeGuards.js";

export class TransformationService extends BaseService implements ITransformationService {
  protected getResourceName(): string {
    return 'Transformation';
  }

  async listTransformations(params: TransformationListParams = {}): Promise<TransformationInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/transformations${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<TransformationInfo>>(endpoint);
    return this.extractArray(result);
  }

  async countTransformations(params: Pick<TransformationListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/transformations/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }

  async getTransformation(transformationName: string): Promise<TransformationInfo> {
    assertDefined(transformationName, "Transformation name is required");
    
    const endpoint = this.buildEntityEndpoint('/transformations', transformationName);
    return this.syncClient.get<TransformationInfo>(endpoint);
  }

  async createTransformation(params: TransformationCreateParams): Promise<TransformationInfo> {
    assertDefined(params.transformationName, "Transformation name is required");
    assertDefined(params.connection, "Connection is required for transformation creation");
    
    const transformationData: Record<string, any> = {
      TransformationName: params.transformationName,
      Connection: params.connection,
    };
    
    // Trigger configuration
    if (params.transformationTriggerMode !== undefined) {
      transformationData.TransformationTriggerMode = params.transformationTriggerMode;
    }
    if (params.triggerAfterJob) {
      transformationData.TriggerAfterJob = params.triggerAfterJob;
    }
    if (params.triggerTasks) {
      transformationData.TriggerTasks = params.triggerTasks;
    }
    if (params.scheduledCron) {
      transformationData.ScheduledCron = params.scheduledCron;
    }
    
    // Notification parameters
    if (params.sendEmailNotification !== undefined) {
      transformationData.SendEmailNotification = toBooleanString(params.sendEmailNotification);
    }
    if (params.notifyEmailTo) {
      transformationData.NotifyEmailTo = params.notifyEmailTo;
    }
    if (params.notifyEmailSubject) {
      transformationData.NotifyEmailSubject = params.notifyEmailSubject;
    }
    if (params.emailErrorOnly !== undefined) {
      transformationData.EmailErrorOnly = toBooleanString(params.emailErrorOnly);
    }
    
    // Verbosity
    if (params.verbosity) {
      transformationData.Verbosity = params.verbosity;
    }
    
    // Handle queries in Query# format
    if (params.queries && Array.isArray(params.queries)) {
      params.queries.forEach((query: string, index: number) => {
        transformationData[`Query#${index + 1}`] = query;
      });
    }
    
    // Additional parameters
    if (params.commandTimeout) {
      transformationData.CommandTimeout = params.commandTimeout;
    }
    if (params.automaticJobRetry !== undefined) {
      transformationData.AutomaticJobRetry = toBooleanString(params.automaticJobRetry);
    }
    
    // Add workspace to request body for POST operations
    const currentWorkspace = this.getWorkspace();
    if (currentWorkspace && currentWorkspace !== 'default') {
      transformationData.WorkspaceId = currentWorkspace;
      if (process.env.DEBUG_WORKSPACE) {
        console.error(`[Transformation Create] Adding WorkspaceId to body: ${currentWorkspace}`);
      }
    }

    return this.syncClient.post<TransformationInfo>("/transformations", transformationData);
  }

  async updateTransformation(params: TransformationUpdateParams): Promise<TransformationInfo> {
    assertDefined(params.transformationName, "Transformation name is required");
    
    const transformationData: Record<string, any> = {};
    
    // Connection can be updated
    if (params.connection) {
      transformationData.Connection = params.connection;
    }
    
    // Trigger configuration
    if (params.transformationTriggerMode !== undefined) {
      transformationData.TransformationTriggerMode = params.transformationTriggerMode;
    }
    if (params.triggerAfterJob !== undefined) {
      transformationData.TriggerAfterJob = params.triggerAfterJob;
    }
    if (params.triggerTasks !== undefined) {
      transformationData.TriggerTasks = params.triggerTasks;
    }
    if (params.scheduledCron !== undefined) {
      transformationData.ScheduledCron = params.scheduledCron;
    }
    
    // Notification parameters
    if (params.sendEmailNotification !== undefined) {
      transformationData.SendEmailNotification = toBooleanString(params.sendEmailNotification);
    }
    if (params.notifyEmailTo !== undefined) {
      transformationData.NotifyEmailTo = params.notifyEmailTo;
    }
    if (params.notifyEmailSubject !== undefined) {
      transformationData.NotifyEmailSubject = params.notifyEmailSubject;
    }
    if (params.emailErrorOnly !== undefined) {
      transformationData.EmailErrorOnly = toBooleanString(params.emailErrorOnly);
    }
    
    // Verbosity
    if (params.verbosity !== undefined) {
      transformationData.Verbosity = params.verbosity;
    }
    
    // Handle queries in Query# format for updates
    if (params.queries && Array.isArray(params.queries)) {
      params.queries.forEach((query: string, index: number) => {
        transformationData[`Query#${index + 1}`] = query;
      });
    }
    
    // Additional parameters
    if (params.commandTimeout !== undefined) {
      transformationData.CommandTimeout = params.commandTimeout;
    }
    if (params.automaticJobRetry !== undefined) {
      transformationData.AutomaticJobRetry = toBooleanString(params.automaticJobRetry);
    }
    
    // DBT-related parameters (if supported - keeping from original)
    if ((params as any).projectPath !== undefined) transformationData.ProjectPath = (params as any).projectPath;
    if ((params as any).dbtSchema !== undefined) transformationData.DBTSchema = (params as any).dbtSchema;
    if ((params as any).type !== undefined) transformationData.Type = (params as any).type;
    if ((params as any).threads !== undefined) transformationData.Threads = (params as any).threads;
    if ((params as any).projectType !== undefined) transformationData.ProjectType = (params as any).projectType;
    if ((params as any).gitRepositoryURL !== undefined) transformationData.GitRepositoryURL = (params as any).gitRepositoryURL;
    if ((params as any).gitToken !== undefined) transformationData.GitToken = (params as any).gitToken;

    const endpoint = this.buildEntityEndpoint('/transformations', params.transformationName);
    return this.syncClient.put<TransformationInfo>(endpoint, transformationData);
  }

  async deleteTransformation(params: TransformationDeleteParams): Promise<DeleteResponse> {
    assertDefined(params.transformationName, "Transformation name is required");
    
    const endpoint = this.buildEntityEndpoint('/transformations', params.transformationName);
    return this.handleDelete(endpoint);
  }

  async getTransformationProperty(transformationName: string, propertyName: string): Promise<string> {
    assertDefined(transformationName, "Transformation name is required");
    assertDefined(propertyName, "Property name is required");
    
    const endpoint = this.buildEntityEndpoint('/transformations', transformationName);
    return this.getProperty(endpoint, propertyName);
  }
}