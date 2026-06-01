import { ApiError } from '../utils/ApiError.js';

/**
 * Role-based access control. Pass the roles allowed to hit the route.
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role permissions'));
    }
    return next();
  };
