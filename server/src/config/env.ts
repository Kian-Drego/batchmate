import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root so client and server share one file.
// From src/config (dev) or dist/config (build) the root is three levels up.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/scholarship_passport',
  // Development convenience: fall back to an in-memory database when no local
  // MongoDB is reachable. Never enabled in production.
  useMemoryDb: bool(process.env.USE_MEMORY_DB, process.env.NODE_ENV !== 'production'),

  jwtSecret: process.env.JWT_SECRET ?? 'insecure-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
    get enabled() {
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    },
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3' | 'supabase',
    localDir: process.env.LOCAL_UPLOAD_DIR ?? './uploads',
    awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
    awsBucket: process.env.AWS_S3_BUCKET ?? '',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    supabaseBucket: process.env.SUPABASE_BUCKET ?? 'scholarship-documents',
  },

  ai: {
    provider: (process.env.AI_PROVIDER ?? 'disabled') as
      | 'openai-compatible'
      | 'huggingface'
      | 'disabled',
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.groq.com/openai/v1',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'llama-3.1-8b-instant',
    huggingfaceKey: process.env.HUGGINGFACE_API_KEY ?? '',
  },

  scraper: {
    live: bool(process.env.SCRAPER_LIVE, false),
    maxPages: int(process.env.SCRAPER_MAX_PAGES, 5),
  },
};

export type Env = typeof env;
