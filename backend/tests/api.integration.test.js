import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock the pg Pool so the real app boots without a live database. --------
// Every controller imports `query`/`withTransaction` from src/db/pool.js, which
// in turn calls pool.query. We intercept at the pg layer with a programmable
// queue of responses so each test can script exactly what the DB "returns".
const queryMock = vi.fn();

vi.mock('pg', () => {
  class Pool {
    query(...args) {
      return queryMock(...args);
    }
    connect() {
      return Promise.resolve({
        query: (...args) => queryMock(...args),
        release: () => {},
      });
    }
    on() {}
  }
  return { default: { Pool } };
});

// Provide deterministic JWT secrets before config loads.
process.env.JWT_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.NODE_ENV = 'test';

const request = (await import('supertest')).default;
const { createApp } = await import('../src/app.js');
const bcrypt = (await import('bcryptjs')).default;

const app = createApp();

// Helper: queue the next query response(s) in call order.
const queueRows = (...resultsInOrder) => {
  for (const rows of resultsInOrder) {
    queryMock.mockResolvedValueOnce({ rows: Array.isArray(rows) ? rows : [rows] });
  }
};

describe('API integration', () => {
  beforeEach(() => {
    queryMock.mockReset();
    // Default: any unscripted query resolves to an empty result set so audit
    // logging and incidental UPDATEs never blow up a test.
    queryMock.mockResolvedValue({ rows: [] });
  });

  describe('POST /api/auth/login', () => {
    it('rejects unknown credentials with 401', async () => {
      queueRows([]); // user lookup -> no rows
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('rejects a wrong password with 401', async () => {
      const hash = await bcrypt.hash('correct-horse', 10);
      queueRows([
        {
          id: 'u1',
          email: 'coach@club.com',
          password_hash: hash,
          role: 'COACH',
          tenant_id: 'club-1',
          is_active: true,
          club_status: 'APPROVED',
          failed_login_attempts: 0,
          locked_until: null,
        },
      ]);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coach@club.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('signs in a valid user and returns tokens', async () => {
      const hash = await bcrypt.hash('correct-horse', 10);
      queueRows([
        {
          id: 'u1',
          email: 'coach@club.com',
          password_hash: hash,
          first_name: 'Cathy',
          last_name: 'Coach',
          role: 'COACH',
          tenant_id: 'club-1',
          is_active: true,
          club_status: 'APPROVED',
          failed_login_attempts: 0,
          locked_until: null,
        },
      ]);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coach@club.com', password: 'correct-horse' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user).toMatchObject({ email: 'coach@club.com', role: 'COACH' });
    });

    it('blocks a pending club with 403', async () => {
      const hash = await bcrypt.hash('correct-horse', 10);
      queueRows([
        {
          id: 'u1',
          email: 'coach@club.com',
          password_hash: hash,
          role: 'COACH',
          tenant_id: 'club-1',
          is_active: true,
          club_status: 'PENDING',
          failed_login_attempts: 0,
          locked_until: null,
        },
      ]);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coach@club.com', password: 'correct-horse' });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/pending/i);
    });
  });

  describe('protected routes', () => {
    it('rejects requests with no Authorization header (401)', async () => {
      const res = await request(app).get('/api/players');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed token (401)', async () => {
      const res = await request(app)
        .get('/api/players')
        .set('Authorization', 'Bearer not-a-real-jwt');
      expect(res.status).toBe(401);
    });
  });

  describe('tenant isolation over HTTP', () => {
    it('forbids a non-admin from selecting another tenant via header (403)', async () => {
      const { signAccessToken } = await import('../src/utils/tokens.js');
      const token = signAccessToken({
        sub: 'u1',
        tenantId: 'club-1',
        role: 'COACH',
        email: 'coach@club.com',
      });
      const res = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'club-2');
      expect(res.status).toBe(403);
    });
  });
});
