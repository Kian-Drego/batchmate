import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { env } from './config/env';
import { databaseReady } from './config/db';
import { attachUser } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';
import { apiLimiter, requestLogger } from './middleware/common';
import { assertNoSensitiveFields } from './domain/privacy';

import authRoutes from './routes/auth';
import passportRoutes from './routes/passport';
import scholarshipRoutes from './routes/scholarships';
import applicationRoutes from './routes/applications';
import examRoutes from './routes/exams';
import analyticsRoutes from './routes/analytics';
import fileRoutes from './routes/files';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.clientOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());

  if (!env.isProd) app.use(requestLogger);

  // Health probe - reports degraded status when the database is unreachable.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: databaseReady() ? 'ok' : 'degraded',
      database: databaseReady() ? 'connected' : 'disconnected',
      storage: env.storage.driver,
      ai: env.ai.provider,
      scraper: env.scraper.live ? 'live' : 'snapshot',
      time: new Date().toISOString(),
    });
  });

  // Global privacy gate: reject any request carrying a national identifier.
  app.use('/api', (req, _res, next) => {
    try {
      assertNoSensitiveFields({ body: req.body, query: req.query });
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', apiLimiter, attachUser);
  app.use('/api/auth', authRoutes);
  app.use('/api/passport', passportRoutes);
  app.use('/api/scholarships', scholarshipRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/files', fileRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
