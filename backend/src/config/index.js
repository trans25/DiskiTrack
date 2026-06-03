import dotenv from 'dotenv';

dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
// In production the database is supplied via DATABASE_URL; locally via PGDATABASE.
if (!process.env.DATABASE_URL) required.push('PGDATABASE');

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  const message = `[config] Missing required environment variable(s): ${missing.join(', ')}`;
  // In production, refuse to boot with insecure fallbacks (e.g. forgeable JWTs).
  if (isProduction) {
    throw new Error(message);
  }
  // eslint-disable-next-line no-console
  console.warn(`${message} — using insecure development defaults.`);
}

export const config = {
  env: isProduction ? 'production' : process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'diskitrack',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_access_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  // Public URL of the frontend, used to build links inside emails (reset /
  // invite). Falls back to the CORS client origin.
  appUrl: process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Guest / demo login. Enabled by default for testing/portfolio demos; set
  // ENABLE_GUEST_LOGIN=false to disable in a locked-down environment.
  enableGuestLogin: process.env.ENABLE_GUEST_LOGIN !== 'false',
  // Where uploaded match videos are stored on disk. On ephemeral hosts (e.g.
  // Render's default filesystem) set UPLOAD_DIR to a mounted persistent disk so
  // videos survive restarts/redeploys; otherwise they are lost on each deploy.
  uploadDir: process.env.UPLOAD_DIR || '',
  // SMTP / email. When host is unset, emails are logged to the console so the
  // full flow still works locally without a mail server.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'DiskiTrack <no-reply@diskitrack.app>',
  },
  // Resend HTTP email API. Preferred in production (e.g. Render) because it
  // works over HTTPS (443) and is not blocked like outbound SMTP ports.
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from:
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      'DiskiTrack <onboarding@resend.dev>',
  },
};
