import { z } from 'zod';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import Resume from '../models/Resume.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { consume } from '../services/usage.service.js';
import { analyzeResume } from '../services/resume.service.js';

export const textSchema = z.object({ title: z.string().trim().max(120).optional(), text: z.string().max(60000).optional() });

async function extractText(file, bodyText) {
  if (file) {
    const isPdf = file.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    const isTxt = file.mimetype === 'text/plain' && !file.buffer.includes(0);
    if (!isPdf && !isTxt) throw new AppError(400, 'Only PDF or plain-text (.txt) resumes are supported.');
    if (isPdf) {
      try {
        return (await pdfParse(file.buffer)).text;
      } catch {
        throw new AppError(422, 'Could not read this PDF. Try exporting it again, or paste the text instead.');
      }
    }
    return file.buffer.toString('utf8');
  }
  return bodyText || '';
}

export const create = asyncHandler(async (req, res) => {
  let text = (await extractText(req.file, req.body?.text)).replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (text.length < 100) throw new AppError(422, 'We could not find enough text in this resume (need at least 100 characters).');
  text = text.slice(0, env.limits.maxResumeChars);
  await consume(req.user._id, 'resumeAnalyses', env.limits.resumeAnalysesPerDay);
  const analysis = await analyzeResume(req.user._id, text);
  const resume = await Resume.addForUser(req.user._id, {
    title: (req.body?.title || req.file?.originalname || 'My resume').slice(0, 120),
    fileName: req.file?.originalname?.slice(0, 120) || '',
    text,
    analysis,
  });
  res.status(201).json({ resume: await Resume.getByIdForUser(req.user._id, resume._id) });
});

export const list = asyncHandler(async (req, res) => {
  const resumes = await Resume.allForUser(req.user._id, 20);
  res.json({ resumes });
});

export const get = asyncHandler(async (req, res) => {
  const resume = await Resume.getByIdForUser(req.user._id, req.params.id);
  if (!resume) throw new AppError(404, 'Resume not found.');
  res.json({ resume });
});

export const remove = asyncHandler(async (req, res) => {
  const r = await Resume.removeForUser(req.user._id, req.params.id);
  if (!r.deletedCount) throw new AppError(404, 'Resume not found.');
  res.json({ ok: true });
});
