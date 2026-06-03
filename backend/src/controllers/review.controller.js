import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Public product reviews / testimonials.
//
// Reviews are platform-wide (not tenant scoped): visitors leave a name,
// optional role, a 1-5 star rating and a comment. Published reviews are
// shown on the public landing page. A SYSTEM_ADMIN can list everything
// and unpublish / delete entries for moderation.

// GET /api/reviews  (public) -> latest published reviews + average rating
export const listPublishedReviews = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, role, rating, comment, created_at
       FROM reviews
      WHERE is_published = TRUE
      ORDER BY created_at DESC
      LIMIT 50`
  );

  const count = rows.length;
  const average =
    count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  res.json({
    reviews: rows,
    summary: { count, average: Math.round(average * 10) / 10 },
  });
});

// POST /api/reviews  (public) -> submit a review (awaits admin approval)
export const createReview = asyncHandler(async (req, res) => {
  const { name, role, rating, comment } = req.body;

  const { rows } = await query(
    `INSERT INTO reviews (name, role, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, role, rating, comment, is_published, created_at`,
    [name, role || null, rating, comment]
  );

  res.status(201).json({
    review: rows[0],
    message: 'Thanks! Your review has been submitted and will appear once it is approved.',
  });
});

// GET /api/reviews/all  (SYSTEM_ADMIN) -> every review for moderation
export const listAllReviews = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, role, rating, comment, is_published, created_at
       FROM reviews
      ORDER BY created_at DESC`
  );
  res.json({ reviews: rows });
});

// PATCH /api/reviews/:id/publish  (SYSTEM_ADMIN) -> toggle visibility
export const setReviewPublished = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isPublished = req.body?.isPublished !== false;

  const { rows } = await query(
    `UPDATE reviews
        SET is_published = $2
      WHERE id = $1
      RETURNING id, name, role, rating, comment, is_published, created_at`,
    [id, isPublished]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json({ review: rows[0] });
});

// DELETE /api/reviews/:id  (SYSTEM_ADMIN)
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM reviews WHERE id = $1', [id]);
  res.status(204).send();
});
