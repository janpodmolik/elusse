/**
 * Error Handler - Centralized error handling for the application
 * 
 * Provides consistent error handling across:
 * - Scene operations
 * - Asset loading
 * - Store operations
 * - Network requests
 */

export type ErrorSeverity = 'warning' | 'error' | 'fatal';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: Error;
}

// Error codes
export const ERROR_CODES = {
  // Scene errors
  SCENE_INIT_FAILED: 'SCENE_INIT_FAILED',
  SCENE_TRANSITION_FAILED: 'SCENE_TRANSITION_FAILED',
  
  // Asset errors
  ASSET_LOAD_FAILED: 'ASSET_LOAD_FAILED',
  BACKGROUND_LOAD_FAILED: 'BACKGROUND_LOAD_FAILED',
  
  // Config errors
  MAP_CONFIG_LOAD_FAILED: 'MAP_CONFIG_LOAD_FAILED',
  MAP_CONFIG_INVALID: 'MAP_CONFIG_INVALID',
  
  // Store errors
  STORE_UPDATE_FAILED: 'STORE_UPDATE_FAILED',
  
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error handler callbacks
 */
interface ErrorHandlerCallbacks {
  onWarning?: (error: AppError) => void;
  onError?: (error: AppError) => void;
  onFatal?: (error: AppError) => void;
}

let callbacks: ErrorHandlerCallbacks = {};

/**
 * Configure error handler callbacks
 */
export function configureErrorHandler(newCallbacks: ErrorHandlerCallbacks): void {
  callbacks = { ...callbacks, ...newCallbacks };
}

/**
 * Create an AppError from various inputs
 */
export function createError(
  code: ErrorCode,
  message: string,
  severity: ErrorSeverity = 'error',
  context?: Record<string, unknown>,
  originalError?: Error
): AppError {
  return {
    code,
    message,
    severity,
    context,
    originalError,
  };
}

/**
 * Handle an error based on severity
 */
export function handleError(error: AppError): void {
  // Always log to console
  const logMethod = error.severity === 'warning' ? console.warn : console.error;
  logMethod(`[${error.code}] ${error.message}`, error.context, error.originalError);
  
  // Call appropriate callback
  switch (error.severity) {
    case 'warning':
      callbacks.onWarning?.(error);
      break;
    case 'error':
      callbacks.onError?.(error);
      break;
    case 'fatal':
      callbacks.onFatal?.(error);
      break;
  }
}

/**
 * Convenience function for scene errors
 */
export function handleSceneError(
  sceneName: string,
  operation: string,
  error: Error
): void {
  handleError(createError(
    ERROR_CODES.SCENE_INIT_FAILED,
    `${sceneName}: ${operation} failed`,
    'error',
    { sceneName, operation },
    error
  ));
}

/**
 * Convenience function for asset loading errors
 */
export function handleAssetError(
  assetKey: string,
  assetPath: string,
  error?: Error
): void {
  handleError(createError(
    ERROR_CODES.ASSET_LOAD_FAILED,
    `Failed to load asset: ${assetKey}`,
    'warning',
    { assetKey, assetPath },
    error
  ));
}

/**
 * Convenience function for config loading errors
 */
export function handleConfigError(
  configType: string,
  error: Error
): void {
  handleError(createError(
    ERROR_CODES.MAP_CONFIG_LOAD_FAILED,
    `Failed to load ${configType} configuration`,
    'error',
    { configType },
    error
  ));
}

/**
 * Try-catch wrapper with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorCode: ErrorCode,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(createError(
      errorCode,
      errorMessage,
      'error',
      context,
      error instanceof Error ? error : new Error(String(error))
    ));
    return null;
  }
}

/**
 * Sync version of try-catch wrapper
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  errorCode: ErrorCode,
  errorMessage: string,
  context?: Record<string, unknown>
): T | null {
  try {
    return operation();
  } catch (error) {
    handleError(createError(
      errorCode,
      errorMessage,
      'error',
      context,
      error instanceof Error ? error : new Error(String(error))
    ));
    return null;
  }
}
