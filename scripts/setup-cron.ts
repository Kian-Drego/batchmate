/**
 * Store the Vault secrets used by pg_cron to call the `jobs` Edge Function.
 * Generates CRON_SECRET (appending it to .env) if it does not exist yet.
 * Afterwards set the same value as a function secret:
 *   npx supabase secrets set CRON_SECRET=<value> --project-ref <ref>
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { need, ROOT } from './env.ts';

let secret = process.env.CRON_SECRET;
if (!secret) {
  secret = randomBytes(32).toString('hex');
  appendFileSync(resolve(ROOT, '.env'), `CRON_SECRET=${secret}\n`);
  console.log('Generated CRON_SECRET and appended it to .env');
}

const client = new pg.Client({ connectionString: need('SUPABASE_DB_URL'), ssl: { rejectUnauthorized: false } });
await client.connect();
for (const [name, value] of [
  ['project_url', need('SUPABASE_URL')],
  ['cron_secret', secret],
] as const) {
  const { rows } = await client.query('select id from vault.secrets where name = $1', [name]);
  if (rows.length) await client.query('select vault.update_secret($1, $2)', [rows[0].id, value]);
  else await client.query('select vault.create_secret($1, $2)', [value, name]);
  console.log(`Vault secret "${name}" stored`);
}
await client.end();
