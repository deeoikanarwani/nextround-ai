// Offline smoke test (no MongoDB needed): `npm run check`
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { heuristicAnalyze } from '../src/services/resume.service.js';
import { heuristicJob, matchResumeToJob } from '../src/services/job.service.js';
import { heuristicEvaluate, nextQuestion, buildContext, MODES } from '../src/services/interview.service.js';
import { buildReport, computeReadiness } from '../src/services/report.service.js';
import { escapeHtml, sendLoginAlert } from '../src/services/mail.service.js';

const resumeText = `Deepika Sharma\ndeepika@example.com +91 98765 43210 github.com/deepika\nEducation\nB.Tech Computer Science, 2026\nExperience\nSoftware Developer Intern\n- Built Node.js and Express microservices with PostgreSQL and Knex.js, reducing API latency by 35%\n- Designed JWT based authorization for 12 companies and deployed with Docker\nProjects\nFleet Management System\n- Developed REST APIs serving 5000 users with Redis caching\nSkills\nJava, SQL, Node.js, Express, PostgreSQL, Redis, Docker, Git, React, AWS`;
const ra = heuristicAnalyze(resumeText);
assert.ok(ra.skills.includes('PostgreSQL') && ra.skills.includes('Node.js') && !ra.skills.includes('JavaScript'));
assert.ok(ra.atsScore > 50, `ats ${ra.atsScore}`);

const ja = heuristicJob('Backend Engineer', `We need a Backend Engineer.\n- Build scalable REST APIs with Java and Spring Boot\n- Work with SQL databases and AWS\n3+ years experience.\nPreferred: Kubernetes, Docker`);
const m = matchResumeToJob(ra, ja);
assert.ok(m.score > 0 && m.missing.includes('Spring Boot') && m.matched.includes('AWS'));

const ctx = buildContext({ user: { level: 'fresher', targetRoles: [] }, interview: {}, resume: { analysis: ra }, job: { title: 'Backend Engineer', analysis: ja } });
const iv = { mode: 'quick', difficulty: 'intermediate', total: MODES.quick.total, turns: [], persona: 'professional' };
let q = await nextQuestion(iv, ctx, 'u1');
assert.ok(q.question.length > 10);
const answers = [
  'I worked on a fleet management backend using Node.js and PostgreSQL. First I analysed slow queries, then I added an index because the table scan was the bottleneck. As a result latency dropped by 35% and I tested it with load tests.',
  'maybe I guess it was ok',
  'In the project I used Redis as a cache because reads were heavy; the trade-off is stale data, so I used short TTLs instead of manual invalidation. Finally monitoring showed 40% fewer DB calls.',
];
for (const a of answers) {
  const turn = { question: q.question, answer: a, difficulty: 'intermediate', topic: q.topic, followUp: q.followUp };
  turn.evaluation = heuristicEvaluate(q.question, a, ctx);
  iv.turns.push(turn);
  q = await nextQuestion(iv, ctx, 'u1');
  assert.ok(!iv.turns.some((t) => t.question === q.question), 'repeated question');
}
assert.ok(iv.turns[0].evaluation.overall > iv.turns[1].evaluation.overall, 'good answer should outscore a weak one');
assert.ok(iv.turns.some((_, i) => i > 0) && iv.turns.length === 3);
const rep = buildReport({ ...iv, mode: 'quick' }, []);
assert.ok(rep.overall > 0 && rep.weaknesses.length && rep.practice.length);
const r = computeReadiness([{ report: rep }]);
assert.ok(r.readiness > 0 && r.weakest.key);

const escaped = escapeHtml('<script>alert("x")</script> & "quoted"');
assert.equal(escaped.includes('&lt;script&gt;') && escaped.includes('&amp;') && escaped.includes('&quot;'), true);
const originalSmtp = { ...env.smtp };
env.smtp.host = '';
env.smtp.port = 465;
env.smtp.user = '';
env.smtp.pass = '';
env.smtp.from = '';
try {
  await assert.doesNotReject(() => sendLoginAlert({ email: 'test@example.com', name: 'Mail Test' }, { ip: '127.0.0.1', userAgent: 'Smoke Test Agent' }));
} finally {
  Object.assign(env.smtp, originalSmtp);
}

// HTTP layer (no DB needed for these)
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const j = async (p, o) => { const res = await fetch(base + p, o); return [res.status, await res.json().catch(() => ({}))]; };
assert.equal((await j('/health'))[0], 200);
assert.equal((await j('/resumes'))[0], 401);
assert.equal((await j('/dashboard', { headers: { Authorization: 'Bearer bad' } }))[0], 401);
assert.equal((await j('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x', password: '1' }) }))[0], 400);
assert.equal((await j('/nope'))[0], 401); // private by default
await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
console.log('Smoke test passed ✔');
