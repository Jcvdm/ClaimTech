/**
 * Utility Functions for MCP Operations
 *
 * Helper functions for common operations across MCP server wrappers.
 */

import { ValidationError } from './errors';

/**
 * Validate that a value is not null or undefined
 */
export function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${name} is required`);
  }
  return value;
}

/**
 * Validate that a string is not empty
 */
export function requiredString(value: string | null | undefined, name: string): string {
  const val = required(value, name);
  if (val.trim() === '') {
    throw new ValidationError(`${name} cannot be empty`);
  }
  return val;
}

/**
 * Validate that a number is within a range
 */
export function inRange(
  value: number,
  min: number,
  max: number,
  name: string
): number {
  if (value < min || value > max) {
    throw new ValidationError(
      `${name} must be between ${min} and ${max}, got ${value}`
    );
  }
  return value;
}

/**
 * Validate that a value is one of allowed options
 */
export function oneOf<T>(
  value: T,
  allowed: readonly T[],
  name: string
): T {
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `${name} must be one of [${allowed.join(', ')}], got ${value}`
    );
  }
  return value;
}

/**
 * Format pagination parameters with defaults and validation
 */
export function formatPagination(params?: {
  page?: number;
  perPage?: number;
}): { page: number; perPage: number } {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 30;

  return {
    page: inRange(page, 1, Number.MAX_SAFE_INTEGER, 'page'),
    perPage: inRange(perPage, 1, 100, 'perPage'),
  };
}

/**
 * Format a project ID to ensure it's valid
 */
export function formatProjectId(projectId: string): string {
  return requiredString(projectId, 'projectId');
}

/**
 * Format a GitHub owner/repo pair
 */
export function formatRepo(owner: string, repo: string): { owner: string; repo: string } {
  return {
    owner: requiredString(owner, 'owner'),
    repo: requiredString(repo, 'repo'),
  };
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delayMs = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await delay(Math.min(delayMs, maxDelay));
      delayMs *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Sanitize SQL query by removing comments and normalizing whitespace
 */
export function sanitizeSQL(query: string): string {
  return query
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if a value is a valid UUID
 */
export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Format file size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
