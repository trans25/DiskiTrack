import { ApiError } from '../utils/ApiError.js';

/**
 * Validates `req.body` against a Zod schema and replaces it with the parsed
 * (and coerced) result.
 * @param {import('zod').ZodTypeAny} schema
 * @returns {import('express').RequestHandler}
 */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(ApiError.badRequest('Validation failed', result.error.flatten()));
  }
  req.body = result.data;
  return next();
};
