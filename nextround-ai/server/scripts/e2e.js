// End-to-end test against the RUNNING server (MongoDB + `npm run dev` must be up).
// Usage (from the server folder):  node scripts/e2e.js      (optional: API=http://localhost:5001/api)
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';

const BASE = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : extra); };

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

const stamp = Date.now();
const pw = 'TestPass123!';
const A = { email: `e2e_a_${stamp}@example.com`, name: 'E2E A' };
const B = { email: `e2e_b_${stamp}@example.com`, name: 'E2E B' };

const resumeText = `Deepika Test\ntest@example.com +91 98765 43210 github.com/test\nEducation\nB.Tech Computer Science\nExperience\nSoftware Developer Intern\n- Built Node.js and Express APIs with PostgreSQL and Redis, reducing latency by 35%\n- Designed JWT authorization and deployed services with Docker\nProjects\nFleet Management System\n- Developed REST APIs for 5000 users\nSkills\nJava, SQL, Node.js, Express, PostgreSQL, Redis, Docker, Git, React, AWS`;
const jdText = 'We are hiring a Backend Engineer. Build scalable REST APIs with Java, Spring Boot, SQL and AWS. 2+ years experience. Preferred: Docker, Kubernetes.';
const answer = 'I built the backend with Node.js and PostgreSQL. First I profiled slow queries, then added an index because the table scan was the bottleneck. As a result latency dropped by 35% and I verified it with load tests. The trade-off was slower writes, so I monitored them.';

try {
  await mongoose.connect(env.mongoUri);
  // --- auth
  let r = await call('GET', '/resumes');
  ok('unauthenticated request returns 401', r.status === 401, r.status);
  r = await call('POST', '/auth/register', null, { email: 'bad', password: '1' });
  ok('invalid register input returns 400', r.status === 400, r.status);
  r = await call('POST', '/auth/register', null, { ...A, password: pw });
  ok('register user A', r.status === 201 && r.data.token, JSON.stringify(r.data));
  A.token = r.data.token;
  r = await call('POST', '/auth/register', null, { ...B, password: pw });
  ok('register user B', r.status === 201 && r.data.token, JSON.stringify(r.data));
  B.token = r.data.token;
  B.id = r.data.user?.id;
  r = await call('POST', '/auth/register', null, { ...A, password: pw });
  ok('duplicate email returns 409', r.status === 409, r.status);
  r = await call('POST', '/auth/login', null, { email: A.email, password: 'wrong-password' });
  ok('wrong password returns 401', r.status === 401, r.status);
  r = await call('POST', '/auth/login', null, { email: A.email, password: pw });
  ok('login user A', r.status === 200 && r.data.token, JSON.stringify(r.data));

  const existingForgot = await call('POST', '/auth/forgot-password', null, { email: A.email });
  const missingForgot = await call('POST', '/auth/forgot-password', null, { email: `missing_${stamp}@example.com` });
  ok('forgot password response is identical for existing and missing emails', existingForgot.status === 200 && missingForgot.status === 200 && JSON.stringify(existingForgot.data) === JSON.stringify(missingForgot.data), JSON.stringify({ existing: existingForgot.data, missing: missingForgot.data }));
  r = await call('POST', '/auth/reset-password', null, { token: 'bogus-token', password: 'ResetPass123!' });
  ok('bogus reset token returns 400', r.status === 400, JSON.stringify(r.data));
  r = await call('POST', '/auth/change-password', A.token, { currentPassword: 'WrongPass123!', newPassword: 'ChangedPass123!' });
  ok('change password with wrong current password returns 403', r.status === 403, JSON.stringify(r.data));
  const oldAToken = A.token;
  r = await call('POST', '/auth/change-password', A.token, { currentPassword: pw, newPassword: 'ChangedPass123!' });
  ok('change password returns a new token', r.status === 200 && r.data.token && r.data.token !== oldAToken, JSON.stringify(r.data));
  A.token = r.data.token;
  A.password = 'ChangedPass123!';
  const oldSession = await call('GET', '/auth/me', oldAToken);
  const newSession = await call('GET', '/auth/me', A.token);
  ok('old password session is rejected and new session works', oldSession.status === 401 && newSession.status === 200, JSON.stringify({ old: oldSession.status, new: newSession.status }));

  await User.setEmailVerified(B.id, false);
  r = await call('POST', '/resumes', B.token, { title: 'Blocked resume', text: resumeText });
  ok('unverified user is blocked from creating a resume', r.status === 403 && r.data.code === 'EMAIL_NOT_VERIFIED', JSON.stringify(r.data));
  await User.setEmailVerified(B.id, true);

  // --- resume, job
  r = await call('POST', '/resumes', A.token, { title: 'Test resume', text: resumeText });
  ok('upload resume (pasted text)', r.status === 201 && r.data.resume?.analysis?.atsScore > 0, JSON.stringify(r.data));
  const resumeId = r.data.resume?._id;
  r = await call('POST', '/jobs', A.token, { title: 'Backend Engineer', company: 'TestCo', description: jdText, resumeId });
  ok('create job with match score', r.status === 201 && Number.isFinite(r.data.job?.match?.score), JSON.stringify(r.data));
  const jobId = r.data.job?._id;

  // --- interview
  r = await call('POST', '/interviews', A.token, { mode: 'quick', resumeId, jobId });
  ok('create interview with first question', r.status === 201 && r.data.interview?.turns?.length === 1, JSON.stringify(r.data));
  let iv = r.data.interview;
  const ivId = iv?._id;
  let done = false, n = 0;
  while (iv && !done && n < 15) {
    r = await call('POST', `/interviews/${ivId}/answer`, A.token, { answer });
    if (r.status !== 200) { ok('answer question', false, JSON.stringify(r.data)); break; }
    done = r.data.done; iv = r.data.interview; n++;
  }
  ok('interview completed after answering all questions', done === true && n === 5, `answered ${n}, done=${done}`);
  r = await call('GET', `/interviews/${ivId}`, A.token);
  const rep = r.data.interview?.report;
  ok('report has overall score and weaknesses', r.data.interview?.status === 'completed' && Number.isFinite(rep?.overall) && rep?.weaknesses?.length > 0, JSON.stringify(rep));
  r = await call('POST', `/interviews/${ivId}/answer`, A.token, { answer });
  ok('answering a completed interview returns 409', r.status === 409, r.status);

  // --- dashboard, analytics
  r = await call('GET', '/dashboard', A.token);
  ok('dashboard works and readiness exists', r.status === 200 && r.data.readiness?.readiness > 0, JSON.stringify(r.data).slice(0, 200));
  r = await call('GET', '/analytics', A.token);
  ok('analytics works', r.status === 200 && r.data.count >= 1, JSON.stringify(r.data).slice(0, 200));

  // --- data isolation: B must not see or touch A's data
  const probes = [['GET', `/resumes/${resumeId}`], ['DELETE', `/resumes/${resumeId}`], ['GET', `/jobs/${jobId}`], ['DELETE', `/jobs/${jobId}`],
    ['GET', `/interviews/${ivId}`], ['POST', `/interviews/${ivId}/answer`, { answer }], ['POST', `/interviews/${ivId}/finish`], ['DELETE', `/interviews/${ivId}`]];
  for (const [m, p, b] of probes) {
    r = await call(m, p, B.token, b);
    ok(`isolation: B ${m} ${p.replace(/[0-9a-f]{24}/g, ':id')} returns 404 (or 409/404 for closed interview)`, r.status === 404 || (p.includes('/answer') && r.status === 404), r.status);
  }
  r = await call('GET', '/resumes', B.token);
  ok('isolation: B resume list is empty', r.status === 200 && r.data.resumes.length === 0, JSON.stringify(r.data));
  r = await call('GET', '/interviews', B.token);
  ok('isolation: B interview list is empty', r.status === 200 && r.data.interviews.length === 0, JSON.stringify(r.data));
  r = await call('GET', `/resumes/${resumeId}`, A.token);
  ok('A still owns resume after B delete attempts', r.status === 200, r.status);

  // --- quota
  let got429 = false;
  for (let i = 0; i < 12 && !got429; i++) {
    r = await call('POST', '/interviews', A.token, { mode: 'rapid' });
    if (r.status === 429) got429 = true;
  }
  ok('interview daily quota returns 429', got429);
} catch (e) {
  fail++;
  console.log('FAIL unexpected error:', e.message, '(is the server running on', BASE + '?)');
} finally {
  for (const u of [A, B]) {
    if (!u.token) continue;
    const r = await call('DELETE', '/auth/me', u.token, { password: u.password || pw });
    ok(`cleanup: delete account ${u.name}`, r.status === 200, r.status);
  }
  await mongoose.disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}