import { ZodError } from 'zod';

/**
 * Safely extract error message from unknown catch clause value.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Type guard for Zod validation errors.
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
