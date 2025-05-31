// src/utils/typeGuards.ts

import { ODataResponse, SuccessResponse } from '../types/responses.js';

// Response type guards
export function isODataResponse<T>(response: any): response is ODataResponse<T> {
  return response && 
         typeof response === 'object' && 
         'value' in response && 
         Array.isArray(response.value);
}

export function isSuccessResponse(response: any): response is SuccessResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         typeof response.success === 'boolean';
}

export function isArrayResponse<T>(response: any): response is T[] {
  return Array.isArray(response);
}

// Parameter validation guards
export function hasRequiredParams<T extends Record<string, any>>(
  params: any,
  required: (keyof T)[]
): params is T {
  if (!params || typeof params !== 'object') return false;
  return required.every(key => params[key] !== undefined && params[key] !== null);
}

export function hasOneOfParams<T extends Record<string, any>>(
  params: any,
  oneOf: (keyof T)[]
): params is T {
  if (!params || typeof params !== 'object') return false;
  return oneOf.some(key => params[key] !== undefined && params[key] !== null);
}

// Type checking utilities
export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

export function isStringArray(value: any): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

// Safe property access
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

// Enum validation
export function isValidEnum<T extends Record<string, string | number>>(
  value: any,
  enumObject: T
): value is T[keyof T] {
  return Object.values(enumObject).includes(value);
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Cron expression validation
export function isValidCron(cron: string): boolean {
  // Basic validation - can be enhanced with a proper cron parser
  const specialExpressions = ['@yearly', '@annually', '@monthly', '@weekly', '@daily', '@hourly'];
  if (specialExpressions.includes(cron)) return true;
  
  const cronParts = cron.split(' ');
  return cronParts.length >= 5 && cronParts.length <= 7;
}

// ID validation (for numeric IDs stored as strings)
export function isValidId(id: any): id is string {
  if (typeof id === 'string') return true;
  if (typeof id === 'number') return true;
  return false;
}

// Safe type narrowing
export function assertDefined<T>(
  value: T | undefined | null,
  message?: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message || 'Value is undefined or null');
  }
}

export function assertType<T>(
  value: any,
  guard: (value: any) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message || 'Type assertion failed');
  }
}