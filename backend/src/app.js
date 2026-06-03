import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = () => {
  const app = express();

  // Render (and most PaaS hosts) put the app behind a reverse proxy. Trusting
  // the first proxy hop lets express-rate-limit read the real client IP from
  // the X-Forwarded-For header instead of throwing a validation error.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Allow <video> elements on the frontend origin to load uploaded files.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );
  // Larger limit so base64 image data URLs (player photos, club/team logos)
  // sent as JSON do not get rejected and reset the connection.
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

  // Serve uploaded match videos. Filenames are unguessable; range requests are
  // supported by express.static so the <video> element can seek.
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '..', 'uploads'), {
      maxAge: '1d',
      fallthrough: false,
    })
  );

  // Basic abuse protection on the API surface.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Stricter limiter for the auth surface to slow brute-force/credential
  // stuffing. `skipSuccessfulRequests` means only FAILED attempts count, so
  // legitimate logins, registrations and session checks (/auth/me) are never
  // penalised — only repeated failures trip the limit.
  app.use(
    ['/api/auth/login', '/api/auth/guardian-login', '/api/auth/forgot-password'],
    rateLimit({
      windowMs: 15 * 60_000,
      max: 20,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many attempts. Please try again later.' },
    })
  );

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
