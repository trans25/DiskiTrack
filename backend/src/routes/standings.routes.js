import { Router } from 'express';
import { getStandings } from '../controllers/standings.controller.js';

const router = Router();

// Visible to all authenticated roles. Tenant isolation scopes the log to the
// caller's own club; SYSTEM_ADMIN (null tenant) sees an aggregate table.
// Optional ?teamId=<uuid> narrows to a single internal team's fixtures.
router.get('/', getStandings);

export default router;
