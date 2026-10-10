import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { computeReadiness } from './report.service.js';
import { DIMENSIONS, DIM_LABEL } from '../lib/scoring.js';
import { getUsage } from './usage.service.js';
import { env } from '../config/env.js';
import { aiEnabled } from './ai.service.js';

const FOCUS_TO_MODE = { communication: 'behavioral', structure: 'behavioral', confidence: 'behavioral', technical: 'technical', problemSolving: 'system_design', roleKnowledge: 'job' };

export async function getDashboard(user) {
  const uid = user._id;
  const [resume, job, completed, recent, usage] = await Promise.all([
    Resume.latestForUser(uid, 'title analysis createdAt'),
    Job.latestForUser(uid, 'title company match analysis createdAt'),
    Interview.allForUser(uid, { status: 'completed' }, { sort: { createdAt: -1 }, limit: 20, select: 'mode overall report.scores createdAt' }),
    Interview.allForUser(uid, {}, { sort: { createdAt: -1 }, limit: 5, select: 'mode status overall total createdAt turns.answer' }),
    getUsage(uid),
  ]);

  const readiness = computeReadiness(completed);
  const modesDone = new Set(completed.map((i) => i.mode));
  const hasAny = (...m) => m.some((x) => modesDone.has(x));

  let nextAction;
  if (!resume) nextAction = { title: 'Upload your resume', body: 'Your resume becomes the context for every interview.', cta: 'Upload resume', to: '/resume' };
  else if (!job) nextAction = { title: 'Add a target job', body: 'Paste a job description to see your match and a role-specific interview focus.', cta: 'Add job', to: '/jobs' };
  else if (!completed.length) nextAction = { title: 'Take your first interview', body: `Start a quick practice for ${job.title}.`, cta: 'Start interview', to: `/interview/new?mode=job&jobId=${job._id}&resumeId=${resume._id}` };
  else {
    const w = readiness.weakest;
    nextAction = { title: `15-minute ${w.label} practice`, body: `Your recent interviews show ${w.label.toLowerCase()} is your biggest opportunity (${w.score}).`, cta: 'Practice now', to: `/interview/new?mode=targeted&focus=${w.key}${job ? `&jobId=${job._id}` : ''}${resume ? `&resumeId=${resume._id}` : ''}` };
  }

  const roadmap = [
    { label: 'Profile', done: user.onboarded },
    { label: 'Resume', done: Boolean(resume) },
    { label: 'Target role', done: Boolean(job) },
    { label: 'Role match', done: Boolean(job?.match) },
    { label: 'Technical interview', done: hasAny('technical', 'quick', 'full', 'job', 'rapid') },
    { label: 'Behavioral interview', done: hasAny('behavioral', 'quick', 'full', 'targeted') },
    { label: 'System design', done: hasAny('system_design', 'full') },
    { label: 'Final readiness', done: Boolean(readiness && readiness.readiness >= 80) },
  ];
  const nextIdx = roadmap.findIndex((r) => !r.done);
  roadmap.forEach((r, i) => { r.status = r.done ? 'done' : i === nextIdx ? 'next' : 'later'; });

  return {
    readiness, nextAction, roadmap,
    resume: resume && { id: resume._id, title: resume.title, atsScore: resume.analysis?.atsScore },
    job: job && { id: job._id, title: job.title, company: job.company, matchScore: job.match?.score },
    recent: recent.map((i) => ({ id: i._id, mode: i.mode, status: i.status, overall: i.overall, total: i.total, createdAt: i.createdAt })),
    usage: { ...usage, limits: env.limits, aiProvider: aiEnabled() ? 'gemini' : 'built-in' },
  };
}

export async function getAnalytics(userId) {
  const completed = await Interview.allForUser(userId, { status: 'completed' }, { sort: { createdAt: 1 }, limit: 50, select: 'mode overall report.scores createdAt' });
  const trend = completed.map((i) => ({ id: i._id, mode: i.mode, date: i.createdAt, overall: i.overall, scores: i.report?.scores || {} }));
  const dims = DIMENSIONS.map(({ key, label }) => {
    const vals = trend.map((t) => t.scores[key]).filter(Number.isFinite);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const first = vals.slice(0, Math.min(3, Math.ceil(vals.length / 2)));
    const last = vals.slice(-Math.min(3, Math.ceil(vals.length / 2)));
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const change = vals.length >= 2 ? Math.round(mean(last) - mean(first)) : null;
    return { key, label, average: avg, latest: vals.length ? vals[vals.length - 1] : null, change };
  });
  const scored = dims.filter((d) => d.average !== null).sort((a, b) => a.average - b.average);
  const overallChange = trend.length >= 2 ? trend[trend.length - 1].overall - trend[0].overall : null;
  return {
    count: trend.length, trend, dimensions: dims, overallChange,
    weaknesses: scored.slice(0, 2).map((d) => ({ key: d.key, label: DIM_LABEL[d.key], average: d.average, mode: FOCUS_TO_MODE[d.key] })),
    strengths: scored.slice(-2).reverse().map((d) => ({ key: d.key, label: DIM_LABEL[d.key], average: d.average })),
  };
}
