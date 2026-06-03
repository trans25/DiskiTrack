import dotenv from 'dotenv';

dotenv.config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
// In production the database is supplied via DATABASE_URL; locally via PGDATABASE.
if (!process.env.DATABASE_URL) required.push('PGDATABASE');
for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Warning: environment variable ${key} is not set.`);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
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
