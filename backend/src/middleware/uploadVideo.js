import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the on-disk video store (backend/uploads/videos).
export const VIDEO_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'videos');
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const ALLOWED = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const safe = `${req.params.id || 'match'}-${Date.now()}-${Math.round(
      Math.random() * 1e6
    )}${ext}`;
    cb(null, safe);
  },
});

// Single-file video upload, capped at 1 GB.
export const uploadVideo = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only video files (mp4, webm, mov, mkv, ogg) are allowed'));
  },
}).single('video');
