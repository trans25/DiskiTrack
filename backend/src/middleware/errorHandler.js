import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/**
 * Centralized error handler. Must be registered last.
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten(),
    });
  }

  // Postgres unique violation
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(config.env === 'development' ? { message: err.message } : {}),
  });
};

/** @type {import('express').RequestHandler} */
export const notFoundHandler = (_req, res) =>
  res.status(404).json({ error: 'Route not found' });
