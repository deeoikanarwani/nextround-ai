import { z } from 'zod';
import Interview from '../models/Interview.js';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { consume } from '../services/usage.service.js';
import { MODES, LEVELS, nextQuestion, evaluateAnswer, adaptDifficulty, loadInterviewContext, finalizeInterview } from '../services/interview.service.js';

export const createSchema = z.object({
  mode: z.enum(Object.keys(MODES)),
  difficulty: z.enum(LEVELS).default('intermediate'),
  persona: z.enum(['friendly', 'professional', 'strict', 'technical', 'behavioral']).default('professional'),
  resumeId: z.string().optional(),
  jobId: z.string().optional(),
  focus: z.string().trim().max(40).optional(),
  project: z.object({
    name: z.string().trim().min(1).max(100),
    tech: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    description: z.string().trim().max(600).optional().default(''),
  }).optional(),
});
export const answerSchema = z.object({ answer: z.string().trim().min(1, 'write an answer first').max(env.limits.maxAnswerChars) });

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const [resume, job] = await Promise.all([
    b.resumeId ? Resume.getByIdForUser(req.user._id, b.resumeId, '_id') : null,
    b.jobId ? Job.getByIdForUser(req.user._id, b.jobId, '_id') : null,
  ]);
  if (b.resumeId && !resume) throw new AppError(404, 'Resume not found.');
  if (b.jobId && !job) throw new AppError(404, 'Job not found.');
  if (b.mode === 'job' && !job) throw new AppError(400, 'Choose a target job for a job interview.');
  if (b.mode === 'project' && !b.project) throw new AppError(400, 'Describe the project you want to be interviewed on.');

  await consume(req.user._id, 'interviews', env.limits.interviewsPerDay);
  const interview = new Interview({
    user: req.user._id, mode: b.mode, persona: b.persona, difficulty: b.difficulty,
    resume: resume?._id, job: job?._id, project: b.project, focus: b.focus || '', total: MODES[b.mode].total,
  });
  const ctx = await loadInterviewContext(req.user, interview);
  const q = await nextQuestion(interview, ctx, req.user._id);
  interview.turns.push({ ...q, difficulty: interview.difficulty });
  await Interview.saveDocument(interview);
  res.status(201).json({ interview });
});

export const answer = asyncHandler(async (req, res) => {
  const interview = await Interview.getByIdForUser(req.user._id, req.params.id);
  if (!interview) throw new AppError(404, 'Interview not found.');
  if (interview.status !== 'in_progress') throw new AppError(409, 'This interview is already completed.');
  const turn = interview.turns[interview.turns.length - 1];
  if (!turn || turn.answer) throw new AppError(409, 'There is no open question to answer.');

  const ctx = await loadInterviewContext(req.user, interview);
  const evaluation = await evaluateAnswer(turn, req.body.answer, ctx, req.user._id);
  turn.answer = req.body.answer;
  turn.evaluation = evaluation;
  turn.answeredAt = new Date();
  interview.difficulty = adaptDifficulty(interview);
  interview.markModified('turns');

  const done = interview.turns.length >= interview.total;
  if (done) await finalizeInterview(interview);
  else {
    const q = await nextQuestion(interview, ctx, req.user._id);
    interview.turns.push({ ...q, difficulty: interview.difficulty });
  }
  await Interview.saveDocument(interview);
  res.json({ interview, evaluation, done });
});

export const finish = asyncHandler(async (req, res) => {
  const interview = await Interview.getByIdForUser(req.user._id, req.params.id);
  if (!interview) throw new AppError(404, 'Interview not found.');
  if (interview.status === 'completed') return res.json({ interview });
  if (!interview.turns.some((t) => t.evaluation)) throw new AppError(400, 'Answer at least one question before finishing.');
  await finalizeInterview(interview);
  await Interview.saveDocument(interview);
  res.json({ interview });
});

export const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
  const filter = { ...(req.query.status ? { status: String(req.query.status) } : {}) };
  const [items, total] = await Promise.all([
    Interview.allForUser(req.user._id, filter, {
      skip: (page - 1) * limit,
      limit,
      select: 'mode difficulty status overall total createdAt completedAt focus report.scores report.practiceDelta',
    }),
    Interview.totalForUser(req.user._id, filter),
  ]);
  res.json({ interviews: items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

export const get = asyncHandler(async (req, res) => {
  const interview = await Interview.getByIdForUser(req.user._id, req.params.id);
  if (!interview) throw new AppError(404, 'Interview not found.');
  res.json({ interview });
});

export const remove = asyncHandler(async (req, res) => {
  const r = await Interview.removeForUser(req.user._id, req.params.id);
  if (!r.deletedCount) throw new AppError(404, 'Interview not found.');
  res.json({ ok: true });
});
