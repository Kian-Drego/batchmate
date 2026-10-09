/**
 * Create (or reset) the admin login. Generates a strong password, stores
 * ADMIN_EMAIL / ADMIN_PASSWORD in the root .env and prints them once.
 *
 *   npm --workspace scripts run create-admin                 # admin@batchmate.app
 *   npm --workspace scripts run create-admin -- other@x.com  # custom email
 *   add --reset to rotate the password of an existing admin
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adminClient, ROOT } from './env.ts';

const email = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? process.env.ADMIN_EMAIL ?? 'admin@batchmate.app';
const reset = process.argv.includes('--reset');
const password = randomBytes(18).toString('base64url');

function saveEnv(values: Record<string, string>) {
  const file = resolve(ROOT, '.env');
  let text = readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${v}`;
    text = new RegExp(`^${k}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(file, text);
}

const db = adminClient();
const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email === email);

if (user && !reset) {
  console.log(`${email} already exists. Re-run with --reset to rotate its password.`);
} else if (user) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
} else {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'BatchMate Admin' } });
  if (error) throw error;
  user = data.user;
}

const { error: roleErr } = await db.from('profiles').update({ role: 'admin' }).eq('id', user!.id);
if (roleErr) throw roleErr;

if (!user || reset || !list.users.some((u) => u.email === email)) {
  saveEnv({ ADMIN_EMAIL: email, ADMIN_PASSWORD: password });
  console.log(`\nAdmin ready\n  email:    ${email}\n  password: ${password}\n(saved to .env as ADMIN_EMAIL / ADMIN_PASSWORD)\n`);
} else {
  console.log(`${email} confirmed as admin.`);
}
