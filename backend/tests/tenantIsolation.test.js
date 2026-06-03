import { describe, it, expect, vi } from 'vitest';
import { tenantIsolation } from '../src/middleware/tenantIsolation.js';

// tenantIsolation() is pure logic — verifies hard multi-tenant boundaries.
describe('tenantIsolation middleware', () => {
  const run = (user, headers = {}, query = {}) => {
    const req = { user, headers, query };
    const next = vi.fn();
    tenantIsolation(req, {}, next);
    return { req, next };
  };

  it('locks a non-admin user to their own tenant', () => {
    const { req, next } = run({ role: 'CLUB_ADMIN', tenantId: 'club-1' });
    expect(req.tenantId).toBe('club-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks cross-tenant access attempts', () => {
    const { next } = run(
      { role: 'COACH', tenantId: 'club-1' },
      { 'x-tenant-id': 'club-2' }
    );
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it('lets SYSTEM_ADMIN select a tenant via header', () => {
    const { req } = run(
      { role: 'SYSTEM_ADMIN', tenantId: null },
      { 'x-tenant-id': 'club-9' }
    );
    expect(req.tenantId).toBe('club-9');
  });

  it('allows SYSTEM_ADMIN with no tenant selected', () => {
    const { req, next } = run({ role: 'SYSTEM_ADMIN', tenantId: null });
    expect(req.tenantId).toBeNull();
    expect(next).toHaveBeenCalledWith();
  });
});
