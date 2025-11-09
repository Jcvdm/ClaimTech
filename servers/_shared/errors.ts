/**
 * Error Classes for MCP Operations
 *
 * Consistent error handling across all MCP server wrappers.
 * Each error class provides context-specific information for debugging.
 */

/**
 * Base error for all MCP execution failures
 */
export class MCPExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MCPExecutionError';

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPExecutionError);
    }
  }
}

/**
 * Error for invalid parameters or input validation failures
 */
export class ValidationError extends MCPExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends MCPExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error for permission/authorization failures
 */
export class PermissionError extends MCPExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends MCPExecutionError {
  constructor(resource: string, identifier: string, details?: unknown) {
    super(`${resource} not found: ${identifier}`, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

/**
 * Error for network connection issues
 */
export class NetworkError extends MCPExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * Error for operations that exceed timeout
 */
export class TimeoutError extends MCPExecutionError {
  constructor(operation: string, timeout: number, details?: unknown) {
    super(
      `Operation '${operation}' exceeded timeout of ${timeout}ms`,
      'TIMEOUT_ERROR',
      details
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends MCPExecutionError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    details?: unknown
  ) {
    super(message, 'RATE_LIMIT_ERROR', details);
    this.name = 'RateLimitError';
  }
}

/**
 * Error for conflicts (e.g., merge conflicts, concurrent modifications)
 */
export class ConflictError extends MCPExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT_ERROR', details);
    this.name = 'ConflictError';
  }
}

/**
 * Type guard to check if error is an MCPExecutionError
 */
export function isMCPExecutionError(error: unknown): error is MCPExecutionError {
  return error instanceof MCPExecutionError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard to check if error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
