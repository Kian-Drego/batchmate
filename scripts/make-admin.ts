/**
 * Promote an existing account to admin (or demote with --revoke).
 *   npm --workspace scripts run make-admin -- someone@example.com
 */
import { adminClient } from './env.ts';

const email = process.argv.slice(2).find((a) => !a.startsWith('--'));
const role = process.argv.includes('--revoke') ? 'student' : 'admin';
if (!email) {
  console.error('Usage: make-admin <email> [--revoke]');
  process.exit(1);
}

const db = adminClient();
const { data, error } = await db.from('profiles').update({ role }).eq('email', email).select('id');
if (error) throw error;
if (!data?.length) {
  console.error(`No account with email ${email}. Sign up first.`);
  process.exit(1);
}
console.log(`${email} is now ${role}`);
