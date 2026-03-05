import { Context, Next } from 'hono';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(errors: any[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400, { errors });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof ZodError) {
      return c.json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, 400);
    }

    if (error instanceof AppError) {
      return c.json({
        error: error.message,
        code: error.code,
        details: error.details,
      }, error.statusCode);
    }

    // Generic error
    return c.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
}

export function notFoundHandler(c: Context) {
  return c.json({
    error: 'Not found',
    code: 'NOT_FOUND',
  }, 404);
}