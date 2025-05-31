// src/utils/typeConverters.ts

import { VerbosityLevel, JobType, UserRole, TransformationTriggerMode } from '../types/parameters.js';

// Boolean converters
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
}

export function toBooleanString(value: any): 'true' | 'false' {
  return toBoolean(value) ? 'true' : 'false';
}

// Numeric converters
export function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  throw new Error(`Cannot convert ${value} to number`);
}

export function toInteger(value: any): number {
  const num = toNumber(value);
  return Math.floor(num);
}

export function toString(value: any): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

// Enum converters
export function toVerbosityLevel(value: any): VerbosityLevel {
  const level = toString(value);
  if (['1', '2', '3', '4'].includes(level)) {
    return level as VerbosityLevel;
  }
  // Default to info level
  return '2';
}

export function toJobType(value: any): JobType {
  const type = typeof value === 'number' ? value : toInteger(value);
  if ([1, 2, 3, 7, 10].includes(type)) {
    return type as JobType;
  }
  throw new Error(`Invalid job type: ${value}`);
}

export function toUserRole(value: any): UserRole {
  const role = toString(value).toLowerCase();
  
  // Handle common variations
  const roleMap: Record<string, UserRole> = {
    'admin': 'cdata_admin',
    'cdata_admin': 'cdata_admin',
    'standard': 'cdata_standard',
    'cdata_standard': 'cdata_standard',
    'job_creator': 'cdata_job_creator',
    'cdata_job_creator': 'cdata_job_creator',
    'job creator': 'cdata_job_creator',
    'support': 'cdata_support',
    'cdata_support': 'cdata_support',
    'job_operator': 'cdata_support',
    'job operator': 'cdata_support'
  };
  
  const mapped = roleMap[role];
  if (mapped) return mapped;
  
  throw new Error(`Invalid user role: ${value}`);
}

export function toTransformationTriggerMode(value: any): TransformationTriggerMode {
  const mode = toString(value);
  if (['None', 'Scheduled', 'AfterJob'].includes(mode)) {
    return mode as TransformationTriggerMode;
  }
  throw new Error(`Invalid transformation trigger mode: ${value}`);
}

// Array converters
export function toArray<T>(value: any, itemConverter?: (item: any) => T): T[] {
  if (Array.isArray(value)) {
    return itemConverter ? value.map(itemConverter) : value;
  }
  if (value === null || value === undefined) return [];
  // Single value to array
  const item = itemConverter ? itemConverter(value) : value;
  return [item as T];
}

export function toStringArray(value: any): string[] {
  return toArray(value, toString);
}

// Date converters
export function toISOString(value: any): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  throw new Error(`Cannot convert ${value} to ISO date string`);
}

// Query parameter converters
export function toQueryParams(params: Record<string, any>): URLSearchParams {
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      value.forEach(item => queryParams.append(key, toString(item)));
    } else if (typeof value === 'boolean') {
      queryParams.append(key, toBooleanString(value));
    } else {
      queryParams.append(key, toString(value));
    }
  }
  
  return queryParams;
}

// Safe converters with defaults
export function toNumberOrDefault(value: any, defaultValue: number): number {
  try {
    return toNumber(value);
  } catch {
    return defaultValue;
  }
}

export function toStringOrDefault(value: any, defaultValue: string): string {
  try {
    return toString(value);
  } catch {
    return defaultValue;
  }
}

// ID converters (handle large numeric IDs)
export function toIdString(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value && typeof value === 'object' && 'toString' in value) {
    return value.toString();
  }
  throw new Error(`Cannot convert ${value} to ID string`);
}

// Special converters for API compatibility
export function apiBoolean(value: any): string {
  return toBoolean(value) ? 'true' : 'false';
}

export function apiStringArray(value: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  value.forEach((item, index) => {
    result[`Item#${index + 1}`] = item;
  });
  return result;
}