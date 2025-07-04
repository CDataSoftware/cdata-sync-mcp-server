// src/services/CertificateService.ts

import { BaseService } from "./BaseService.js";
import { CertificateInfo } from "../types/api.js";
import {
  CertificateListParams,
  CertificateCreateParams
} from "../types/parameters.js";
import { ApiResponse } from "../types/responses.js";
import { ICertificateService } from "../types/services.js";
import { assertDefined } from "../utils/typeGuards.js";

export class CertificateService extends BaseService implements ICertificateService {
  protected getResourceName(): string {
    return 'Certificate';
  }

  async listCertificates(params: CertificateListParams = {}): Promise<CertificateInfo[]> {
    const queryParams = this.buildQueryParams(params);
    const endpoint = `/certificates${queryParams}`;
    
    const result = await this.syncClient.get<ApiResponse<CertificateInfo>>(endpoint);
    return this.extractArray(result);
  }

  async createCertificate(params: CertificateCreateParams): Promise<CertificateInfo> {
    assertDefined(params.name, "Certificate name is required");
    assertDefined(params.data, "Certificate data is required");
    assertDefined(params.storeType, "Store type is required");
    
    const certificateData: Record<string, any> = {
      Name: params.name,
      Data: params.data,
      StoreType: params.storeType,
    };
    
    // Add workspace to request body if not default
    const workspace = this.getWorkspace();
    if (workspace && workspace !== 'default') {
      certificateData.WorkspaceId = workspace;
    }
    
    return this.syncClient.post<CertificateInfo>("/certificates", certificateData);
  }
}