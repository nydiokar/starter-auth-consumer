import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  cookie: {
    name: process.env.SESSION_COOKIE_NAME || 'app.sid',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict' as const,
    ttlDays: Number(process.env.SESSION_TTL_DAYS || 7),
  },
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'app.csrf',
  pepper: process.env.AUTH_PEPPER || 'dev-pepper',
  mailer: {
    from: process.env.MAIL_FROM || 'App <no-reply@example.com>',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SEEDED_SMTP_PASS || process.env.SMTP_PASS || 'pass',
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};

