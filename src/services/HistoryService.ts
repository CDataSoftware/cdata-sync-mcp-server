// src/services/HistoryService.ts

import { BaseService } from "./BaseService.js";
import { HistoryInfo } from "../types/api.js";
import { HistoryListParams } from "../types/parameters.js";
import { CountResponse, ApiResponse } from "../types/responses.js";
import { IHistoryService } from "../types/services.js";
import { toIdString } from "../utils/typeConverters.js";

export class HistoryService extends BaseService implements IHistoryService {
  protected getResourceName(): string {
    return 'History';
  }

  async listHistory(params: HistoryListParams = {}): Promise<HistoryInfo[]> {
    const queryParams = this.buildOrderedQueryParams(params);
    const endpoint = `/history${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<HistoryInfo>>(endpoint);
    
    // Ensure all numeric IDs are converted to strings if needed
    const history = this.extractArray(result);
    if (Array.isArray(history)) {
      return history.map((item: any) => ({
        ...item,
        Id: toIdString(item.Id || item.id)  // Ensure Id is string
      }));
    }
    return history;
  }

  async countHistory(params: Pick<HistoryListParams, 'filter'> = {}): Promise<CountResponse> {
    const queryParams = new URLSearchParams();
    if (params.filter) queryParams.append("$filter", params.filter);

    const endpoint = `/history/$count${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await this.syncClient.get<any>(endpoint);
    return this.extractCount(result);
  }
}