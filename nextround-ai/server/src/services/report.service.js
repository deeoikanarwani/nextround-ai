import { DIMENSIONS, DIM_LABEL, LOW_ADVICE, HIGH_NOTE, avg, clamp, overallOf } from '../lib/scoring.js';

const KEYS = DIMENSIONS.map((d) => d.key);

export function averageScores(turns) {
  const out = {};
  for (const k of KEYS) out[k] = clamp(avg(turns.map((t) => t.evaluation?.scores?.[k]).filter(Number.isFinite)));
  return out;
}

const topFrequent = (lists, n) => {
  const m = new Map();
  lists.flat().forEach((s) => m.set(s, (m.get(s) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s);
};

/** previous: array of earlier completed interviews (with report.scores) for the practice delta. */
export function buildReport(interview, previous = []) {
  const turns = interview.turns.filter((t) => t.evaluation);
  const scores = averageScores(turns);
  const overall = overallOf(scores);
  const ranked = KEYS.map((k) => ({ key: k, label: DIM_LABEL[k], score: scores[k] })).sort((a, b) => a.score - b.score);
  const weaknesses = ranked.filter((d) => d.score < 75).slice(0, 3).map((d) => ({ ...d, reason: LOW_ADVICE[d.key] }));
  if (!weaknesses.length) weaknesses.push({ ...ranked[0], reason: `Your lowest area, but still solid. ${LOW_ADVICE[ranked[0].key]}` });
  const strengths = ranked.filter((d) => d.score >= 75).reverse().slice(0, 3).map((d) => ({ ...d, reason: HIGH_NOTE[d.key] }));

  const report = {
    overall,
    scores,
    summary:
      overall >= 80 ? 'Excellent performance. You are close to interview-ready.' :
      overall >= 65 ? 'Solid base with clear areas to sharpen before the real thing.' :
      'Good start. Focused practice on the areas below will raise your score quickly.',
    strengths,
    weaknesses,
    commonStrengths: topFrequent(turns.map((t) => t.evaluation.strengths || []), 4),
    commonImprovements: topFrequent(turns.map((t) => t.evaluation.improvements || []), 4),
    practice: weaknesses.slice(0, 2).map((w) => ({ focus: w.key, label: `15-minute ${w.label} practice`, minutes: 15 })),
    questions: turns.map((t) => ({ question: t.question, topic: t.topic, followUp: t.followUp, overall: t.evaluation.overall, strengths: t.evaluation.strengths, improvements: t.evaluation.improvements, suggestion: t.evaluation.suggestion })),
    answered: turns.length,
  };

  if (interview.mode === 'targeted' && interview.focus && KEYS.includes(interview.focus)) {
    const before = previous.map((p) => p.report?.scores?.[interview.focus]).filter(Number.isFinite);
    if (before.length) report.practiceDelta = { focus: interview.focus, label: DIM_LABEL[interview.focus], before: clamp(avg(before)), after: scores[interview.focus] };
  }
  return report;
}

/** Readiness from the latest completed interviews (newest first), recency-weighted. */
export function computeReadiness(completed) {
  const recent = completed.slice(0, 5).filter((i) => i.report?.scores);
  if (!recent.length) return null;
  const weights = [5, 4, 3, 2, 1];
  const wsum = recent.reduce((s, _, i) => s + weights[i], 0);
  const dims = {};
  for (const k of KEYS) dims[k] = clamp(recent.reduce((s, it, i) => s + (it.report.scores[k] ?? 0) * weights[i], 0) / wsum);
  const readiness = overallOf(dims);
  const ranked = KEYS.map((k) => ({ key: k, label: DIM_LABEL[k], score: dims[k] })).sort((a, b) => a.score - b.score);
  const weakest = ranked[0], strongest = ranked[ranked.length - 1];
  const headline = readiness >= 80 ? 'You are close to interview-ready.' : readiness >= 65 ? "You're building real momentum." : "You're early in your preparation.";
  return {
    readiness, dimensions: dims, weakest, strongest,
    why: `${headline} Your strongest area is ${strongest.label.toLowerCase()} (${strongest.score}). Your biggest opportunity is ${weakest.label.toLowerCase()} (${weakest.score}).`,
    interviewsCounted: recent.length,
  };
}
