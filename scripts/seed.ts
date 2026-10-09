/**
 * Seed the scholarship catalogue from the bundled snapshot (idempotent).
 * `--demo` also creates a demo student with a filled-in passport.
 *
 *   npm --workspace scripts run seed
 *   npm --workspace scripts run seed:demo
 */
import { adminClient } from './env.ts';
import { ingestSnapshot } from '../supabase/functions/_shared/catalogue.ts';

const DEMO_EMAIL = 'student@example.com';

async function main() {
  const db = adminClient();
  const count = await ingestSnapshot(db as never);
  console.log(`Catalogue: ${count} scholarships upserted`);

  if (!process.argv.includes('--demo')) return;

  const password = process.env.DEMO_PASSWORD || 'password123';
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: 'Demo Student' },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created demo user ${DEMO_EMAIL}`);
  } else {
    console.log(`Demo user ${DEMO_EMAIL} already exists`);
  }

  const { error } = await db
    .from('passports')
    .update({
      full_name: 'Demo Student',
      institution: 'Government College of Engineering, Pune',
      course: 'B.Tech Computer Engineering',
      degree: 'Professional (MBBS/BTech/LLB)',
      current_year: '2nd Year',
      class12_percentage: 86.4,
      cgpa: 8.1,
      entrance_exam_name: 'MHT-CET',
      entrance_exam_score: 96.2,
      state: 'Maharashtra',
      category: 'OBC',
      income_bracket: '250000-500000',
      gender: 'Female',
      disability_status: false,
    })
    .eq('user_id', user!.id);
  if (error) throw error;
  console.log('Demo passport filled');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
