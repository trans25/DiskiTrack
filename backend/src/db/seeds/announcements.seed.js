import { query, pool } from '../pool.js';

const run = async () => {
  const clubs = await query('SELECT id, name FROM clubs');
  for (const c of clubs.rows) {
    const admin = await query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role = 'CLUB_ADMIN' LIMIT 1`,
      [c.id]
    );
    const authorId = admin.rows[0]?.id ?? null;

    const exists = await query(
      'SELECT 1 FROM announcements WHERE tenant_id = $1 LIMIT 1',
      [c.id]
    );
    if (exists.rowCount) {
      console.log('Skip (already has notices):', c.name);
      continue;
    }

    await query(
      `INSERT INTO announcements (tenant_id, author_id, title, body, is_pinned)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        c.id,
        authorId,
        `Welcome to ${c.name} on DiskiTrack`,
        'This is your club notice board. Coaches and admins can post training updates, fixture changes and club news here. Pinned notices stay at the top and show on the dashboard.',
        true,
      ]
    );
    await query(
      `INSERT INTO announcements (tenant_id, author_id, title, body, is_pinned)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        c.id,
        authorId,
        'Training this week',
        'Training continues as scheduled. Please arrive 15 minutes early for warm-ups and bring both home and away kits.',
        false,
      ]
    );
    console.log('Seeded notices for:', c.name);
  }
  await pool.end();
};

run().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
