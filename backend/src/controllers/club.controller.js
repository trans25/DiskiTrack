import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toClub = (r) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  country: r.country,
  city: r.city,
  logoUrl: r.logo_url,
  isActive: r.is_active,
  createdAt: r.created_at,
});

// SYSTEM_ADMIN only — list every tenant.
export const listClubs = asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT * FROM clubs ORDER BY name ASC`);
  res.json(rows.map(toClub));
});

export const getClub = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM clubs WHERE id = $1`, [
    req.params.id,
  ]);
  if (!rows[0]) throw ApiError.notFound('Club not found');
  res.json(toClub(rows[0]));
});

/**
 * Create a club (tenant) and optionally bootstrap its first ClubAdmin.
 * SYSTEM_ADMIN only.
 */
export const createClub = asyncHandler(async (req, res) => {
  const { name, slug, country, city, logoUrl } = req.body;
  const admin = req.body.admin; // optional { email, password, firstName, lastName }

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO clubs (name, slug, country, city, logo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, country ?? null, city ?? null, logoUrl ?? null]
    );
    const club = rows[0];

    let clubAdmin = null;
    if (admin?.email && admin?.password) {
      const hash = await bcrypt.hash(admin.password, 10);
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, 'CLUB_ADMIN') RETURNING id, email, role`,
        [club.id, admin.email, hash, admin.firstName ?? 'Club', admin.lastName ?? 'Admin']
      );
      clubAdmin = userRes.rows[0];
    }

    return { club, clubAdmin };
  });

  res.status(201).json({ ...toClub(result.club), admin: result.clubAdmin });
});

export const updateClub = asyncHandler(async (req, res) => {
  const { name, country, city, logoUrl, isActive } = req.body;
  const { rows } = await query(
    `UPDATE clubs
        SET name = COALESCE($2, name),
            country = COALESCE($3, country),
            city = COALESCE($4, city),
            logo_url = COALESCE($5, logo_url),
            is_active = COALESCE($6, is_active)
      WHERE id = $1
      RETURNING *`,
    [req.params.id, name, country, city, logoUrl, isActive]
  );
  if (!rows[0]) throw ApiError.notFound('Club not found');
  res.json(toClub(rows[0]));
});

/**
 * Delete a club (tenant) and everything associated with it.
 * ON DELETE CASCADE on tenant_id removes its teams, users, players, matches,
 * events, lineups, stats and guardians automatically. SYSTEM_ADMIN only.
 */
export const deleteClub = asyncHandler(async (req, res) => {
  const { rowCount } = await query(`DELETE FROM clubs WHERE id = $1`, [
    req.params.id,
  ]);
  if (!rowCount) throw ApiError.notFound('Club not found');
  res.status(204).send();
});
