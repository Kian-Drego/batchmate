/** End-to-end RLS/RPC smoke test with a throwaway user (deleted afterwards). */
import { createClient } from '@supabase/supabase-js';
import { adminClient, need } from './env.ts';

const admin = adminClient();
const email = `smoke-${Date.now()}@example.com`;
const password = 'Sm0ke-test-pass!';
const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Smoke Test' } });
if (cErr) throw cErr;
const uid = created.user.id;
let adminId: string | null = null;
let failures = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`, ok ? '' : extra ?? '');
};

try {
  const anonKey = need('SUPABASE_PUBLISHABLE_KEY');
  const db = createClient(need('SUPABASE_URL'), anonKey, { auth: { persistSession: false } });
  const { error: sErr } = await db.auth.signInWithPassword({ email, password });
  check('sign in', !sErr, sErr);

  const { data: prof } = await db.from('profiles').select('*').single();
  check('profile auto-created', prof?.name === 'Smoke Test' && prof?.role === 'student', prof);

  const { error: roleErr } = await db.from('profiles').update({ role: 'admin' }).eq('id', uid);
  check('cannot self-promote to admin', !!roleErr, roleErr);

  const { data: pp, error: pErr } = await db.from('passports')
    .update({ degree: 'Undergraduate', state: 'Maharashtra', category: 'OBC', income_bracket: '100000-250000', gender: 'Female', class12_percentage: 82, current_year: '1st Year' })
    .eq('user_id', uid).select().single();
  check('passport update + completeness', !pErr && pp?.completeness === 100, pErr ?? pp);

  const { error: badErr } = await db.from('passports').update({ aadhaar_number: '1234' } as never).eq('user_id', uid);
  check('unknown/sensitive column rejected', !!badErr);

  const { error: compErr } = await db.from('passports').update({ completeness: 5 } as never).eq('user_id', uid);
  check('derived column not writable', !!compErr);

  const { data: sch } = await db.from('scholarships').select('id, required_documents, application_mode').limit(20);
  check('scholarships readable', (sch?.length ?? 0) > 0);

  const { data: mt, error: mtErr } = await db.from('mock_tests').select('*');
  check('mock_tests hidden', !mtErr && (mt?.length ?? 0) === 0, mtErr);

  const external = sch!.filter((s) => s.application_mode === 'external');
  const native = sch!.find((s) => s.application_mode === 'native');
  const target = external[0];
  const { data: app, error: aErr } = await db.rpc('start_application', { p_scholarship: target.id });
  check('start_application', !aErr && app?.status === 'Not Started' && app.checklist.length > 0, aErr ?? app);

  const { data: again } = await db.rpc('start_application', { p_scholarship: target.id });
  check('start_application idempotent', again?.id === app?.id);

  const { data: ticked, error: tErr } = await db.rpc('set_checklist_item', { p_application: app.id, p_item: app.checklist[0].id, p_done: true });
  check('checklist tick -> In Progress', !tErr && ticked?.status === 'In Progress' && ticked.checklist[0].done === true, tErr ?? ticked);

  const { error: badT } = await db.rpc('update_application_status', { p_application: app.id, p_status: 'Awarded' });
  check('illegal transition rejected', !!badT && /Cannot move/.test(badT.message), badT);

  const path = `${uid}/smoke.pdf`;
  const { error: upErr } = await db.storage.from('documents').upload(path, new Blob(['%PDF-1.4 smoke'], { type: 'application/pdf' }));
  check('upload to own folder', !upErr, upErr);
  const { error: otherErr } = await db.storage.from('documents').upload(`00000000-0000-0000-0000-000000000000/x.pdf`, new Blob(['x'], { type: 'application/pdf' }));
  check('upload to other folder blocked', !!otherErr);

  const { data: doc, error: dErr } = await db.from('passport_documents')
    .insert({ type: 'Income Certificate', file_name: 'smoke.pdf', storage_key: path, mime_type: 'application/pdf', size_bytes: 14, status: 'verified' } as never)
    .select().single();
  check('document registered as pending_review', !dErr && doc?.status === 'pending_review' && doc.user_id === uid, dErr ?? doc);

  for (const s of ['Submitted', 'Verification Pending', 'Rejected']) {
    const { error } = await db.rpc('update_application_status', { p_application: app.id, p_status: s, p_note: 'smoke' });
    if (error) check(`transition -> ${s}`, false, error);
  }
  const { data: locked } = await db.from('passport_documents').select('retention_until').eq('id', doc.id).single();
  check('retention window set after terminal status', !!locked?.retention_until, locked);

  await db.from('passport_documents').delete().eq('id', doc.id);
  const { data: still } = await db.from('passport_documents').select('id').eq('id', doc.id);
  check('locked document cannot be deleted', still?.length === 1);

  const { error: insErr } = await db.rpc('get_insights_admin');
  check('students cannot read insights', !!insErr);
  const { error: rawInsErr } = await db.rpc('get_insights');
  check('raw get_insights not callable', !!rawInsErr);
  const { error: reviewErr } = await db.rpc('admin_review_document', { p_document: doc.id, p_status: 'verified' });
  check('students cannot review documents', !!reviewErr);

  // ---- Admin flows (temporary admin) ----
  const adminEmail = `smoke-admin-${Date.now()}@example.com`;
  const { data: ad } = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
  adminId = ad.user!.id;
  await admin.from('profiles').update({ role: 'admin' }).eq('id', adminId);
  const adb = createClient(need('SUPABASE_URL'), anonKey, { auth: { persistSession: false } });
  await adb.auth.signInWithPassword({ email: adminEmail, password });

  const { data: stats, error: stErr } = await adb.rpc('admin_stats');
  check('admin_stats', !stErr && typeof stats?.students === 'number', stErr);
  const { data: ins2, error: ins2Err } = await adb.rpc('get_insights_admin');
  check('admin insights', !ins2Err && typeof ins2?.totals?.profiles === 'number', ins2Err);
  const { data: theirPassport } = await adb.from('passports').select('user_id').eq('user_id', uid);
  check('admin reads student passport', theirPassport?.length === 1);

  const { error: noNote } = await adb.rpc('admin_review_document', { p_document: doc.id, p_status: 'rejected' });
  check('rejection requires a note', !!noNote);
  const { data: rev, error: revErr } = await adb.rpc('admin_review_document', { p_document: doc.id, p_status: 'rejected', p_note: 'Blurry scan' });
  check('admin rejects document with note', !revErr && rev?.status === 'rejected' && rev?.review_note === 'Blurry scan', revErr ?? rev);

  const { data: app2 } = await db.rpc('start_application', { p_scholarship: external[1].id });
  await db.rpc('update_application_status', { p_application: app2.id, p_status: 'In Progress' });
  await db.rpc('update_application_status', { p_application: app2.id, p_status: 'Submitted' });
  const { data: dec, error: decErr } = await adb.rpc('admin_decide_application', { p_application: app2.id, p_status: 'Awarded', p_note: 'Congrats' });
  check('admin awards application', !decErr && dec?.status === 'Awarded', decErr ?? dec);

  if (native) {
    const { data: napp } = await db.rpc('start_application', { p_scholarship: native.id });
    await db.rpc('update_application_status', { p_application: napp.id, p_status: 'In Progress' });
    const { error: selfSubmit } = await db.rpc('update_application_status', { p_application: napp.id, p_status: 'Submitted' });
    check('native apps cannot be self-advanced', !!selfSubmit);
  }

  const { error: selfDemote } = await adb.rpc('admin_set_role', { p_user: adminId, p_role: 'student' });
  check('admin cannot self-demote', !!selfDemote);
  const { data: audit } = await adb.from('admin_audit').select('action').eq('actor_id', adminId);
  check('actions audited', (audit?.length ?? 0) >= 2, audit);
  const { data: studentAudit } = await db.from('admin_audit').select('id');
  check('students cannot read audit log', (studentAudit?.length ?? 0) === 0);
} finally {
  await admin.storage.from('documents').remove([`${uid}/smoke.pdf`]);
  await admin.auth.admin.deleteUser(uid);
  if (adminId) await admin.auth.admin.deleteUser(adminId);
  console.log(failures ? `\n${failures} failure(s)` : '\nAll checks passed');
  process.exitCode = failures ? 1 : 0;
}
