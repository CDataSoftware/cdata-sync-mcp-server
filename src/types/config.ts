// src/types/config.ts
export interface CDataConfig {
  baseUrl?: string;
  username?: string | undefined;
  password?: string | undefined;
  authToken?: string | undefined;
  workspace?: string; // Workspace ID for context (defaults to "default")
}