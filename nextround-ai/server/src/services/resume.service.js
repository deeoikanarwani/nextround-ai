import { extractSkills } from '../lib/skills.js';
import { clamp } from '../lib/scoring.js';
import { generateJSON } from './ai.service.js';

const VERBS = /\b(built|developed|designed|implemented|created|led|optimi[sz]ed|improved|reduced|increased|deployed|architected|automated|integrated|migrated|managed|launched|engineered|refactored|delivered)\b/gi;
const METRICS = /\d+(\.\d+)?\s?(%|x\b|k\b|\+|ms\b|users|requests|million|hours|seconds)/gi;
const CLAIM = /(scalab|millions?|improved|reduced|increased|led |architected|designed|optimi[sz]ed|migrated|\d+\s?%)/i;

function extractProjects(text) {
  const m = text.match(/^\s*projects?\s*:?\s*$/im);
  if (!m) return [];
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(/^\s*(education|experience|skills|certifications?|achievements|internships?|summary)\s*:?\s*$/im);
  const block = end > 0 ? rest.slice(0, end) : rest.slice(0, 1500);
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[-•*▪●]/.test(l) && l.length < 90)
    .slice(0, 5)
    .map((name) => ({ name, tech: extractSkills(block).slice(0, 6), claims: [] }));
}

export function heuristicAnalyze(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const skills = extractSkills(text);
  const has = {
    education: /\beducation\b|\bb\.?tech\b|\bbachelor|\buniversity\b|\bcollege\b/i.test(text),
    experience: /\bexperience\b|\binternship\b|\bwork history\b/i.test(text),
    projects: /\bprojects?\b/i.test(text),
    skills: /\bskills?\b|\btechnologies\b/i.test(text),
    email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
    phone: /\+?\d[\d\s-]{8,}\d/.test(text),
    links: /github\.com|linkedin\.com/i.test(text),
  };
  const metrics = (text.match(METRICS) || []).length;
  const verbs = (text.match(VERBS) || []).length;
  const lengthScore = words >= 150 && words <= 1100 ? 10 : words >= 80 ? 5 : 0;

  const ats = clamp(
    ['education', 'experience', 'projects', 'skills'].filter((k) => has[k]).length * 10 +
      (has.email ? 8 : 0) + (has.phone ? 7 : 0) + (has.links ? 5 : 0) + lengthScore +
      Math.min(15, metrics * 3) + Math.min(15, verbs * 1.5)
  );
  const skillCoverage = clamp(skills.length * 6);
  const experienceStrength = clamp((has.experience ? 40 : 10) + Math.min(30, verbs * 3) + Math.min(30, metrics * 6));
  const projectStrength = clamp((has.projects ? 40 : 10) + Math.min(30, skills.length * 3) + Math.min(30, metrics * 6));

  const strengths = [], improvements = [];
  if (skills.length >= 8) strengths.push(`Good technology coverage (${skills.length} skills detected).`);
  if (verbs >= 6) strengths.push('Uses strong action verbs to describe your work.');
  if (metrics >= 3) strengths.push('Includes measurable results.');
  if (has.projects) strengths.push('Has a projects section you can build interview stories from.');
  if (has.links) strengths.push('Includes GitHub/LinkedIn links.');
  if (metrics < 3) improvements.push('Add measurable impact (percentages, users, latency, time saved) to your bullet points.');
  if (!has.links) improvements.push('Add your GitHub and LinkedIn links.');
  if (!has.skills) improvements.push('Add a clear Skills section so ATS systems can match keywords.');
  if (!has.projects) improvements.push('Add 2–3 projects with the technologies you used and what you owned.');
  if (verbs < 5) improvements.push('Start bullets with action verbs (built, designed, optimised, reduced).');
  if (words < 150) improvements.push('Resume looks short; add detail on projects, internships and results.');
  if (words > 1100) improvements.push('Resume is long; aim for one page for freshers, two for experienced candidates.');

  const sentences = text.split(/[\n.•]+/).map((s) => s.trim()).filter((s) => s.length > 30 && s.length < 220);
  const defensibility = sentences.filter((s) => CLAIM.test(s)).slice(0, 4).map((claim) => ({
    claim,
    prepare: 'Be ready to explain how you did this, how it was measured, the trade-offs, and what you would change.',
  }));

  return { skills, atsScore: ats, skillCoverage, experienceStrength, projectStrength, strengths, improvements, defensibility, projects: extractProjects(text), summary: '', aiPowered: false, wordCount: words };
}

const arr = (v, n = 6) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((s) => s.slice(0, 240)).slice(0, n) : []);

export async function analyzeResume(userId, text) {
  const base = heuristicAnalyze(text);
  const ai = await generateJSON({
    userId,
    system: 'Analyse the resume for interview preparation. Never accuse the candidate of lying.',
    prompt: `Return JSON: {"summary": string (2 sentences), "experienceStrength": 0-100, "projectStrength": 0-100, "strengths": string[] (max 5), "improvements": string[] (max 5, actionable), "projects": [{"name": string, "tech": string[], "claims": string[]}] (max 5), "defensibility": [{"claim": string, "prepare": string}] (max 4; resume claims the candidate should be ready to defend)}\n\nRESUME:\n${text}`,
  });
  if (!ai || typeof ai !== 'object') return base;
  return {
    ...base,
    aiPowered: true,
    summary: String(ai.summary || '').slice(0, 400),
    experienceStrength: Number.isFinite(+ai.experienceStrength) ? clamp(ai.experienceStrength) : base.experienceStrength,
    projectStrength: Number.isFinite(+ai.projectStrength) ? clamp(ai.projectStrength) : base.projectStrength,
    strengths: arr(ai.strengths, 5).length ? arr(ai.strengths, 5) : base.strengths,
    improvements: arr(ai.improvements, 5).length ? arr(ai.improvements, 5) : base.improvements,
    projects: Array.isArray(ai.projects) && ai.projects.length
      ? ai.projects.slice(0, 5).map((p) => ({ name: String(p?.name || '').slice(0, 100), tech: arr(p?.tech, 8), claims: arr(p?.claims, 4) })).filter((p) => p.name)
      : base.projects,
    defensibility: Array.isArray(ai.defensibility) && ai.defensibility.length
      ? ai.defensibility.slice(0, 4).map((d) => ({ claim: String(d?.claim || '').slice(0, 240), prepare: String(d?.prepare || '').slice(0, 300) })).filter((d) => d.claim)
      : base.defensibility,
  };
}
