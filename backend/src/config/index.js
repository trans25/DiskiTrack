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
};
