import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Authenticates the request using the Bearer JWT and attaches `req.user`.
 * @type {import('express').RequestHandler}
 */
export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
};
