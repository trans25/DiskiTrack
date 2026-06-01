/**
 * Wraps an async Express handler so thrown errors flow to the error middleware.
 * @param {import('express').RequestHandler} handler
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
