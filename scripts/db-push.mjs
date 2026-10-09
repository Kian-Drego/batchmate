// Apply supabase/migrations to the project in .env (SUPABASE_DB_URL).
import { execSync } from 'node:child_process';
import { config } from 'dotenv';
config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
if (!process.env.SUPABASE_DB_URL) {
  console.error('Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}
execSync(`npx supabase db push --db-url "${process.env.SUPABASE_DB_URL}"`, { stdio: 'inherit' });
