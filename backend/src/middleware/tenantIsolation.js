import { ApiError } from '../utils/ApiError.js';

/**
 * Tenant isolation middleware.
 *
 * Resolves the effective tenant id for the request and stores it on
 * `req.tenantId`. Every data-access query MUST filter by this value.
 *
 *  - SYSTEM_ADMIN may operate across tenants. They select a tenant via the
 *    `x-tenant-id` header (or `?tenantId=` query). If omitted, req.tenantId is
 *    null and controllers may return cross-tenant data where appropriate.
 *  - All other roles are hard-locked to the tenant baked into their JWT. Any
 *    attempt to override it is rejected.
 *
 * @type {import('express').RequestHandler}
 */
export const tenantIsolation = (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  const requestedTenant =
    req.headers['x-tenant-id'] || req.query.tenantId || null;

  if (req.user.role === 'SYSTEM_ADMIN') {
    req.tenantId = requestedTenant || null;
    return next();
  }

  // Non-system users are scoped to their own tenant only.
  if (requestedTenant && requestedTenant !== req.user.tenantId) {
    return next(ApiError.forbidden('Cross-tenant access is not permitted'));
  }

  if (!req.user.tenantId) {
    return next(ApiError.forbidden('No tenant associated with this account'));
  }

  req.tenantId = req.user.tenantId;
  return next();
};
