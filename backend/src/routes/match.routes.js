import { Router } from 'express';
import {
  listMatches,
  getMatch,
  createMatch,
  updateMatchStatus,
  updateMatch,
  deleteMatch,
  uploadMatchVideo,
} from '../controllers/match.controller.js';
import {
  listMatchEvents,
  createMatchEvent,
  deleteMatchEvent,
} from '../controllers/matchEvent.controller.js';
import {
  getMatchLineup,
  saveMatchLineup,
} from '../controllers/lineup.controller.js';
import { getCallup, setCallup } from '../controllers/callup.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { uploadVideo } from '../middleware/uploadVideo.js';
import {
  createMatchSchema,
  updateMatchStatusSchema,
  updateMatchSchema,
  createMatchEventSchema,
  saveLineupSchema,
  matchCallupSchema,
} from '../validation/schemas.js';

const router = Router();

router.get('/', listMatches);
router.get('/:id', getMatch);
// SYSTEM_ADMIN is read-only on matches and events
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(createMatchSchema),
  createMatch
);
router.patch(
  '/:id/status',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateMatchStatusSchema),
  updateMatchStatus
);
router.patch(
  '/:id',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateMatchSchema),
  updateMatch
);
router.delete('/:id', authorize('CLUB_ADMIN'), deleteMatch);

// Upload a local match video file (mp4/webm/mov/mkv) for video-assisted tagging.
router.post(
  '/:id/video',
  authorize('CLUB_ADMIN', 'COACH'),
  uploadVideo,
  uploadMatchVideo
);

//Live match events
router.get('/:matchId/events', listMatchEvents);
router.post(
  '/:matchId/events',
  authorize('CLUB_ADMIN', 'COACH', 'ANALYST'),
  validateBody(createMatchEventSchema),
  createMatchEvent
);
router.delete(
  '/:matchId/events/:eventId',
  authorize('CLUB_ADMIN', 'COACH'),
  deleteMatchEvent
);

// Lineups / formations
// Anyone in the club can view, but only the COACH selects/edits the lineup.
router.get('/:matchId/lineup', getMatchLineup);
router.put(
  '/:matchId/lineup',
  authorize('COACH'),
  validateBody(saveLineupSchema),
  saveMatchLineup
);

// Matchday call-ups (the travelling squad). Coaches/club admins select it and
// can alert every selected player by email.
router.get('/:matchId/callup', getCallup);
router.put(
  '/:matchId/callup',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(matchCallupSchema),
  setCallup
);

export default router;
