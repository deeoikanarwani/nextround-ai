import { z } from 'zod';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { consume } from '../services/usage.service.js';
import { analyzeJob, matchResumeToJob } from '../services/job.service.js';

export const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().min(50, 'paste the full job description (at least 50 characters)').max(30000),
  resumeId: z.string().optional(),
});
export const matchSchema = z.object({ resumeId: z.string().min(1) });

async function ownedResume(userId, id) {
  const r = await Resume.getByIdForUser(userId, id);
  if (!r) throw new AppError(404, 'Resume not found.');
  return r;
}

export const create = asyncHandler(async (req, res) => {
  const { title, company, description, resumeId } = req.body;
  const resume = resumeId ? await ownedResume(req.user._id, resumeId) : await Resume.latestForUser(req.user._id);
  await consume(req.user._id, 'jobAnalyses', env.limits.jobAnalysesPerDay);
  const text = description.slice(0, env.limits.maxJdChars);
  const analysis = await analyzeJob(req.user._id, title, text);
  const job = await Job.addForUser(req.user._id, {
    title, company, description: text, analysis,
    resume: resume?._id || null,
    match: resume ? { ...matchResumeToJob(resume.analysis, analysis), resumeId: resume._id } : null,
  });
  res.status(201).json({ job: await Job.getByIdForUser(req.user._id, job._id) });
});

export const list = asyncHandler(async (req, res) => {
  const jobs = await Job.allForUser(req.user._id, 30);
  res.json({ jobs });
});

export const get = asyncHandler(async (req, res) => {
  const job = await Job.getByIdForUser(req.user._id, req.params.id);
  if (!job) throw new AppError(404, 'Job not found.');
  res.json({ job });
});

export const rematch = asyncHandler(async (req, res) => {
  const job = await Job.getByIdForUser(req.user._id, req.params.id);
  if (!job) throw new AppError(404, 'Job not found.');
  const resume = await ownedResume(req.user._id, req.body.resumeId);
  const match = { ...matchResumeToJob(resume.analysis, job.analysis), resumeId: resume._id };
  const updated = await Job.updateMatchForUser(req.user._id, job._id, match, resume._id);
  if (!updated) throw new AppError(404, 'Job not found.');
  res.json({ job: updated });
});

export const remove = asyncHandler(async (req, res) => {
  const r = await Job.removeForUser(req.user._id, req.params.id);
  if (!r.deletedCount) throw new AppError(404, 'Job not found.');
  res.json({ ok: true });
});
