import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase, usingMemoryDatabase } from './config/db';
import { startScheduler } from './jobs/scheduler';
import { ensureSeedData } from './seed/bootstrapSeed';

async function bootstrap(): Promise<void> {
  const connected = await connectDatabase();

  // Make sure a fresh database has both the catalogue and demo accounts so the
  // app is usable immediately. Idempotent and guarded by existence checks.
  if (connected) {
    try {
      const { createdUsers, seededCatalogue } = await ensureSeedData();
      if (seededCatalogue) {
        // eslint-disable-next-line no-console
        console.log(`[boot] seeded ${seededCatalogue} scholarships from verified snapshot`);
      }
      if (createdUsers) {
        // eslint-disable-next-line no-console
        console.log('[boot] created demo accounts: student@example.com / admin@example.com (password123)');
      }
      if (usingMemoryDatabase()) {
        // eslint-disable-next-line no-console
        console.log('[boot] NOTE: using in-memory MongoDB — data resets on restart.');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[boot] seed skipped:', (error as Error).message);
    }
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  if (connected) startScheduler();

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
