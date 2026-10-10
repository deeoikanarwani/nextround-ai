import { extractSkills } from '../lib/skills.js';
import { clamp } from '../lib/scoring.js';
import { generateJSON } from './ai.service.js';

const TOPIC_RULES = [
  [/scalab|distributed|high.?availability|microservice|throughput/i, 'System Design'],
  [/\bapi\b|rest|graphql/i, 'APIs'],
  [/database|sql|postgres|mongo|schema/i, 'Database Design'],
  [/cloud|aws|azure|gcp|docker|kubernetes|devops|ci\/cd/i, 'Cloud & DevOps'],
  [/test|quality|qa/i, 'Testing'],
  [/security|auth|oauth|jwt/i, 'Security & Auth'],
  [/team|collaborat|stakeholder|communicat|ownership/i, 'Behavioral & Collaboration'],
  [/machine learning|model|data pipeline|etl/i, 'Data & ML'],
];

export function heuristicJob(title, text) {
  const split = text.search(/preferred|nice to have|bonus|good to have|a plus/i);
  const reqText = split > 0 ? text.slice(0, split) : text;
  const prefText = split > 0 ? text.slice(split) : '';
  const required = extractSkills(reqText);
  const preferred = extractSkills(prefText).filter((s) => !required.includes(s));
  const years = text.match(/(\d+)\s*\+?\s*(?:-\s*\d+\s*)?years?/i);
  const responsibilities = text.split('\n').map((l) => l.trim()).filter((l) => /^[-•*▪●\d.)]+\s*\S/.test(l) && l.length > 25 && l.length < 220)
    .map((l) => l.replace(/^[-•*▪●\d.)\s]+/, '')).slice(0, 8);
  const topics = [...new Set(TOPIC_RULES.filter(([re]) => re.test(text)).map(([, t]) => t))];
  return {
    role: title,
    responsibilities,
    requiredSkills: required,
    preferredSkills: preferred,
    experience: years ? `${years[1]}+ years` : /intern|fresher|graduate|entry/i.test(text) ? 'Entry level' : 'Not specified',
    interviewTopics: topics.length ? topics : ['Technical fundamentals', 'Behavioral & Collaboration'],
    aiPowered: false,
  };
}

const arr = (v, n = 10) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((s) => s.slice(0, 200)).slice(0, n) : []);

export async function analyzeJob(userId, title, text) {
  const base = heuristicJob(title, text);
  const ai = await generateJSON({
    userId,
    system: 'Extract structured hiring requirements from a job description.',
    prompt: `Return JSON: {"role": string, "responsibilities": string[] (max 8), "requiredSkills": string[], "preferredSkills": string[], "experience": string, "interviewTopics": string[] (max 6, likely interview topics)}\n\nJOB TITLE: ${title}\nJOB DESCRIPTION:\n${text}`,
  });
  if (!ai || typeof ai !== 'object') return base;
  const required = arr(ai.requiredSkills, 15);
  return {
    role: String(ai.role || title).slice(0, 120),
    responsibilities: arr(ai.responsibilities, 8).length ? arr(ai.responsibilities, 8) : base.responsibilities,
    requiredSkills: required.length ? required : base.requiredSkills,
    preferredSkills: arr(ai.preferredSkills, 12).length ? arr(ai.preferredSkills, 12) : base.preferredSkills,
    experience: String(ai.experience || base.experience).slice(0, 80),
    interviewTopics: arr(ai.interviewTopics, 6).length ? arr(ai.interviewTopics, 6) : base.interviewTopics,
    aiPowered: true,
  };
}

/** Deterministic, explainable resume ↔ job match. */
export function matchResumeToJob(resumeAnalysis, jobAnalysis) {
  const have = new Set((resumeAnalysis?.skills || []).map((s) => s.toLowerCase()));
  const inResume = (s) => have.has(String(s).toLowerCase());
  const req = jobAnalysis.requiredSkills || [];
  const pref = jobAnalysis.preferredSkills || [];
  const matched = [...req, ...pref].filter(inResume);
  const missingRequired = req.filter((s) => !inResume(s));
  const missingPreferred = pref.filter((s) => !inResume(s));
  const reqScore = req.length ? (req.length - missingRequired.length) / req.length : 0.5;
  const prefScore = pref.length ? (pref.length - missingPreferred.length) / pref.length : reqScore;
  const score = clamp((reqScore * 0.75 + prefScore * 0.25) * 100);
  const focus = [...new Set([...(jobAnalysis.interviewTopics || []).slice(0, 3), ...missingRequired.slice(0, 2).map((s) => `${s} fundamentals`)])];
  const recommendations = [];
  if (missingRequired.length) recommendations.push(`Learn or add evidence for: ${missingRequired.slice(0, 4).join(', ')}.`);
  if (score >= 75) recommendations.push('Strong match. Start a job-specific interview to rehearse how you present it.');
  else recommendations.push('Focus your projects and resume wording on the required skills before applying.');
  recommendations.push('Prepare to explain how you used each matched skill in a real project.');
  return { score, matched, missing: [...missingRequired, ...missingPreferred], missingRequired, focus, recommendations, at: new Date() };
}
