// src/types/jsonrpc.ts

// Additional JSON-RPC types for error handling
export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface JSONRPCErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: JSONRPCError;
}

// Standard JSON-RPC error codes
export const JSONRPCErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000, // -32000 to -32099 are reserved for implementation-defined server errors
} as const;

// Helper function to create error responses
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: any
): JSONRPCErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data
    }
  };
}