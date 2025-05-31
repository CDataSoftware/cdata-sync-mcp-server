// src/services/RequestService.ts

import { BaseService } from "./BaseService.js";
import { RequestInfo } from "../types/api.js";
import {
  RequestListParams,
  RequestDeleteParams
} from "../types/parameters.js";
import {
  DeleteResponse,
  CountResponse,
  ApiResponse
} from "../types/responses.js";
import { IRequestService } from "../types/services.js";
import { assertDefined } from "../utils/typeGuards.js";

export class RequestService extends BaseService implements IRequestService {
  protected getResourceName(): string {
    return 'Request';
  }

  async listRequests(params: RequestListParams = {}): Promise<RequestInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/requests${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<RequestInfo>>(endpoint);
    return this.extractArray(result);
  }

  async countRequests(params: Pick<RequestListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/requests/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }

  async getRequest(id: string): Promise<RequestInfo> {
    assertDefined(id, "Request ID is required");
    
    const endpoint = this.buildEntityEndpoint('/requests', id);
    return this.syncClient.get<RequestInfo>(endpoint);
  }

  async deleteRequest(params: RequestDeleteParams): Promise<DeleteResponse> {
    assertDefined(params.id, "Request ID is required for deletion");
    
    const endpoint = this.buildEntityEndpoint('/requests', params.id);
    return this.handleDelete(endpoint, 'Request log');
  }

  async getRequestProperty(id: string, propertyName: string): Promise<string> {
    assertDefined(id, "Request ID is required");
    assertDefined(propertyName, "Property name is required");
    
    const endpoint = this.buildEntityEndpoint('/requests', id);
    return this.getProperty(endpoint, propertyName);
  }
}