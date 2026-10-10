import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { extractSkills } from '../lib/skills.js';
import { clamp, overallOf } from '../lib/scoring.js';
import { generateJSON } from './ai.service.js';
import { BANK, SEQUENCES, FOCUS_SEQUENCE, FOLLOWUPS } from './questions.js';
import { buildReport } from './report.service.js';

export const MODES = {
  quick: { label: 'Quick practice', total: 5 },
  full: { label: 'Full interview', total: 10 },
  technical: { label: 'Technical', total: 6 },
  behavioral: { label: 'Behavioral', total: 6 },
  system_design: { label: 'System design', total: 5 },
  project: { label: 'Project deep dive', total: 6 },
  job: { label: 'Job interview', total: 8 },
  targeted: { label: 'Targeted practice', total: 5 },
  rapid: { label: 'Rapid fire', total: 8 },
};
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const PERSONAS = {
  friendly: 'warm and encouraging',
  professional: 'professional and neutral',
  strict: 'strict, probing and concise',
  technical: 'deeply technical and detail-oriented',
  behavioral: 'focused on behaviour, ownership and teamwork (STAR)',
};

/** Minimal context sent to the AI (no email, no full resume text). */
export function buildContext({ user, interview, resume, job, previousWeaknesses = [] }) {
  const ra = resume?.analysis || {};
  const ja = job?.analysis || {};
  return {
    level: user.level,
    role: ja.role || job?.title || user.targetRoles?.[0] || 'Software Engineer',
    skills: (ra.skills || []).slice(0, 15),
    projects: (ra.projects || []).slice(0, 4).map((p) => p.name),
    requiredSkills: ja.requiredSkills || [],
    topics: ja.interviewTopics || [],
    previousWeaknesses,
    project: interview.project?.name ? interview.project : null,
  };
}

const fill = (tpl, ctx, idx) => {
  const pool = ctx.project?.tech?.length ? ctx.project.tech : ctx.skills;
  return tpl
    .replace(/\{skill\}/g, pool.length ? pool[idx % pool.length] : 'your main technology')
    .replace(/\{project\}/g, ctx.project?.name || ctx.projects[0] || 'your most significant project')
    .replace(/\{role\}/g, ctx.role);
};

function fallbackQuestion(interview, ctx) {
  const idx = interview.turns.length;
  const last = interview.turns[idx - 1];
  const asked = new Set(interview.turns.map((t) => t.question));
  const probed = new Set(interview.turns.map((t) => t.topic));

  // Adaptive follow-up from the previous answer
  if (last?.answer && interview.mode !== 'rapid') {
    const mentioned = extractSkills(last.answer).filter((s) => !probed.has(s));
    if (mentioned.length && idx % 2 === 1) {
      const q = FOLLOWUPS[idx % FOLLOWUPS.length].replace('{s}', mentioned[0]);
      return { question: q, topic: mentioned[0], followUp: true };
    }
    if (last.answer.split(/\s+/).length < 25) {
      return { question: 'Can you go deeper on that? Walk me through exactly what you did, step by step, and what the outcome was.', topic: 'depth', followUp: true };
    }
  }

  const seq = (interview.mode === 'targeted' ? FOCUS_SEQUENCE[interview.focus] : null) || SEQUENCES[interview.mode] || SEQUENCES.quick;
  let kind = seq[idx % seq.length];
  if (kind === 'job' && !ctx.requiredSkills.length && !interview.job) kind = 'technical';
  if (kind === 'project' && !ctx.project && !ctx.projects.length) kind = 'behavioral';
  const bank = BANK[kind] || BANK.technical;
  let n = 0;
  for (let i = 0; i < bank.length; i++) {
    const q = fill(bank[(i + idx) % bank.length], interview.job && kind === 'job' ? { ...ctx, skills: ctx.requiredSkills.length ? ctx.requiredSkills : ctx.skills } : ctx, idx + n++);
    if (!asked.has(q)) return { question: q, topic: kind, followUp: false };
  }
  return { question: `Tell me more about your experience relevant to the ${ctx.role} role.`, topic: kind, followUp: false };
}

export async function nextQuestion(interview, ctx, userId) {
  const history = interview.turns.slice(-3).map((t, i) => `Q: ${t.question}\nA: ${(t.answer || '(unanswered)').slice(0, 600)}`).join('\n\n');
  const ai = await generateJSON({
    userId,
    system: `You are an interviewer who is ${PERSONAS[interview.persona] || PERSONAS.professional}. Ask exactly ONE question.`,
    prompt: `Interview mode: ${interview.mode}${interview.focus ? ` (focus: ${interview.focus})` : ''}. Difficulty: ${interview.difficulty}. Question ${interview.turns.length + 1} of ${interview.total}.
Candidate level: ${ctx.level}. Target role: ${ctx.role}. Skills: ${ctx.skills.join(', ') || 'unknown'}. Projects: ${ctx.projects.join(', ') || 'none'}.
${ctx.project ? `Project to deep-dive: ${ctx.project.name}; tech: ${(ctx.project.tech || []).join(', ')}; ${ctx.project.description || ''}` : ''}
${ctx.requiredSkills.length ? `Job requires: ${ctx.requiredSkills.join(', ')}. Job topics: ${ctx.topics.join(', ')}.` : ''}
${ctx.previousWeaknesses.length ? `Known weaknesses: ${ctx.previousWeaknesses.join(', ')}.` : ''}
Recent conversation:\n${history || '(start of interview)'}
Rules: if the last answer contains something worth probing (a technology, claim, decision, weakness), ask a natural follow-up referencing it; otherwise move to a new topic suited to the mode. Never repeat an earlier question. Max 60 words. Return JSON: {"question": string, "topic": string, "followUp": boolean}`,
  });
  if (ai?.question && typeof ai.question === 'string') {
    return { question: ai.question.slice(0, 500), topic: String(ai.topic || '').slice(0, 60), followUp: Boolean(ai.followUp) };
  }
  return fallbackQuestion(interview, ctx);
}

/* ---------- Evaluation ---------- */
const TECH = /\b(index|cache|queue|latency|throughput|transaction|api|database|thread|async|complexity|scal\w*|shard\w*|replica\w*|token|hash\w*|middleware|schema|pagination|load.?balanc\w*|retry|idempot\w*|consisten\w*|partition\w*|encrypt\w*|test\w*|query|server|endpoint|authenticat\w*|authoriz\w*)\b/gi;
const STRUCT = /\b(first|second|then|next|finally|because|so that|as a result|result|therefore|situation|task|action|outcome)\b/gi;
const REASON = /\b(because|trade-?offs?|alternatives?|instead|however|if|otherwise|so that|therefore|compared|rather than)\b/gi;
const HEDGE = /\b(maybe|i guess|i think|not sure|probably|kind of|sort of|i don't know|um+|uh+)\b/gi;
const FILLER = /\b(like|basically|actually|you know)\b/gi;
const count = (s, re) => (s.match(re) || []).length;

export function heuristicEvaluate(question, answer, ctx) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const techTerms = new Set((answer.match(TECH) || []).map((x) => x.toLowerCase())).size;
  const skills = extractSkills(answer);
  const roleSkills = new Set([...ctx.requiredSkills, ...ctx.skills].map((s) => s.toLowerCase()));
  const overlap = skills.filter((s) => roleSkills.has(s.toLowerCase())).length;
  const nums = /\d/.test(answer);
  const markers = Math.min(count(answer, STRUCT), 6);
  const reasoning = count(answer, REASON);
  const hedges = count(answer, HEDGE);
  const fillers = count(answer, FILLER);
  const wordScore = words < 10 ? 25 : words < 25 ? 45 : words < 50 ? 62 : words <= 220 ? 80 : words <= 350 ? 70 : 60;
  const t = techTerms + skills.length;

  const scores = {
    technical: clamp(35 + t * 8 + (nums ? 6 : 0) + (words >= 50 ? 8 : 0), 15, 95),
    communication: clamp(wordScore - fillers * 3 + markers * 2, 15, 95),
    problemSolving: clamp(40 + reasoning * 8 + (nums ? 4 : 0) + (words >= 50 ? 4 : 0), 15, 95),
    confidence: clamp(82 - hedges * 9 + (words >= 50 ? 4 : 0) - (words < 15 ? 15 : 0), 15, 95),
    roleKnowledge: clamp(38 + overlap * 9 + t * 4, 15, 95),
    structure: clamp(40 + markers * 9 + (words >= 40 ? 6 : 0), 15, 95),
  };
  const strengths = [], improvements = [];
  if (t >= 3) strengths.push('Used specific technical terms and tools.'); else improvements.push('Name the specific technologies, mechanisms or tools involved.');
  if (markers >= 3) strengths.push('Answer had a clear sequence.'); else improvements.push('Structure the answer: situation → action → result.');
  if (reasoning >= 2) strengths.push('Explained the reasoning and trade-offs behind decisions.'); else improvements.push('Explain why you chose that approach and what alternatives you considered.');
  if (hedges >= 2) improvements.push('Reduce hedging phrases such as "maybe" and "I guess".'); else if (words >= 40) strengths.push('Confident, direct delivery.');
  if (words < 30) improvements.push('Answer was very short; add concrete detail and an example.');
  if (words > 300) improvements.push('Answer was long; lead with the key point and trim details.');
  if (!nums) improvements.push('Add a measurable result or number where possible.');
  return { scores, strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3), suggestion: improvements[0] || 'Keep this level of detail.', overall: overallOf(scores), engine: 'heuristic' };
}

export async function evaluateAnswer(turn, answer, ctx, userId) {
  const ai = await generateJSON({
    userId,
    system: 'You are a fair, specific interview evaluator. Score only what the answer actually contains.',
    prompt: `Candidate level: ${ctx.level}. Role: ${ctx.role}. Difficulty: ${turn.difficulty}.
Question: ${turn.question}
Answer: ${answer}
Return JSON: {"scores": {"technical":0-100,"communication":0-100,"problemSolving":0-100,"confidence":0-100,"roleKnowledge":0-100,"structure":0-100}, "strengths": string[] (max 3), "improvements": string[] (max 3, specific and actionable), "suggestion": string (one sentence on how to answer better)}`,
  });
  const keys = ['technical', 'communication', 'problemSolving', 'confidence', 'roleKnowledge', 'structure'];
  if (ai?.scores && keys.every((k) => Number.isFinite(+ai.scores[k]))) {
    const scores = Object.fromEntries(keys.map((k) => [k, clamp(ai.scores[k], 10, 98)]));
    const cut = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((s) => s.slice(0, 220)).slice(0, 3) : []);
    return { scores, strengths: cut(ai.strengths), improvements: cut(ai.improvements), suggestion: String(ai.suggestion || '').slice(0, 260), overall: overallOf(scores), engine: 'gemini' };
  }
  return heuristicEvaluate(turn.question, answer, ctx);
}

/** Raise/lower difficulty based on the last two answers. */
export function adaptDifficulty(interview) {
  const answered = interview.turns.filter((t) => t.evaluation).slice(-2);
  if (answered.length < 2) return interview.difficulty;
  const a = (answered[0].evaluation.overall + answered[1].evaluation.overall) / 2;
  const i = LEVELS.indexOf(interview.difficulty);
  if (a >= 80 && i < LEVELS.length - 1) return LEVELS[i + 1];
  if (a <= 50 && i > 0) return LEVELS[i - 1];
  return interview.difficulty;
}

export async function loadInterviewContext(user, interview) {
  const [resume, job, prev] = await Promise.all([
    interview.resume ? Resume.getByIdForUser(user._id, interview.resume, 'analysis') : null,
    interview.job ? Job.getByIdForUser(user._id, interview.job, 'title analysis') : null,
    Interview.latestCompletedForUser(user._id, 'report.weaknesses'),
  ]);
  const previousWeaknesses = (prev?.report?.weaknesses || []).map((w) => w.label).slice(0, 3);
  return buildContext({ user, interview, resume, job, previousWeaknesses });
}

export async function finalizeInterview(interview) {
  interview.turns = interview.turns.filter((t) => t.evaluation);
  const previous = await Interview.previousCompletedForUser(interview.user, interview._id, 5, 'report.scores');
  interview.report = buildReport(interview, previous);
  interview.overall = interview.report.overall;
  interview.status = 'completed';
  interview.completedAt = new Date();
}
