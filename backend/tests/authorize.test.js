import { describe, it, expect, vi } from 'vitest';
import { authorize } from '../src/middleware/authorize.js';

// authorize() is pure RBAC logic — no DB required.
describe('authorize middleware', () => {
  const run = (user, roles) => {
    const req = { user };
    const next = vi.fn();
    authorize(...roles)(req, {}, next);
    return next;
  };

  it('rejects unauthenticated requests', () => {
    const next = run(undefined, ['CLUB_ADMIN']);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('rejects a role not in the allow-list', () => {
    const next = run({ role: 'COACH' }, ['CLUB_ADMIN']);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it('allows a permitted role', () => {
    const next = run({ role: 'CLUB_ADMIN' }, ['CLUB_ADMIN', 'COACH']);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows any authenticated user when no roles specified', () => {
    const next = run({ role: 'PLAYER' }, []);
    expect(next).toHaveBeenCalledWith();
  });
});
