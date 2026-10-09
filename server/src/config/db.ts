import mongoose from 'mongoose';
import { env } from './env';

let memoryServer: unknown | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Connect to MongoDB.
 *
 * In development, if the configured `MONGO_URI` is unreachable and
 * `USE_MEMORY_DB` is not disabled, an in-memory MongoDB instance is started so
 * the app is fully usable without installing a database server. Production
 * never falls back — it logs the failure and retries the real connection.
 */
export async function connectDatabase(): Promise<boolean> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: !env.isProd,
    });
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${env.mongoUri.replace(/\/\/.*@/, '//***@')}`);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[db] initial connection failed:', (error as Error).message);

    if (!env.isProd && env.useMemoryDb) {
      const started = await startMemoryDatabase();
      if (started) return true;
    }

    scheduleReconnect();
    return false;
  }
}

async function startMemoryDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) return true;
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    // eslint-disable-next-line no-console
    console.log('[db] starting in-memory MongoDB (development fallback)…');
    const server = await MongoMemoryServer.create();
    memoryServer = server;
    const uri = server.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    // eslint-disable-next-line no-console
    console.log(`[db] in-memory MongoDB ready at ${uri}`);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[db] in-memory MongoDB could not start:', (error as Error).message);
    // eslint-disable-next-line no-console
    console.error(
      '[db] install MongoDB, set MONGO_URI, or run: npm install && npx mongodb-memory-server (to fetch the binary)'
    );
    return false;
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState === 1) return;
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
      // eslint-disable-next-line no-console
      console.log('[db] reconnected');
    } catch {
      scheduleReconnect();
    }
  }, 10000);
}

export function databaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function usingMemoryDatabase(): boolean {
  return memoryServer !== null;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    const server = memoryServer as { stop: () => Promise<boolean> };
    await server.stop().catch(() => undefined);
    memoryServer = null;
  }
}
