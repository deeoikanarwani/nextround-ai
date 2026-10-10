export const DIMENSIONS = [
  { key: 'technical', label: 'Technical' },
  { key: 'communication', label: 'Communication' },
  { key: 'problemSolving', label: 'Problem solving' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'roleKnowledge', label: 'Role knowledge' },
  { key: 'structure', label: 'Answer structure' },
];
export const DIM_LABEL = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.label]));
export const WEIGHTS = { technical: 0.3, communication: 0.15, problemSolving: 0.2, confidence: 0.1, roleKnowledge: 0.15, structure: 0.1 };

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(+n) ? +n : 0)));
export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export function overallOf(scores) {
  let total = 0, w = 0;
  for (const [k, wt] of Object.entries(WEIGHTS)) {
    if (Number.isFinite(scores?.[k])) { total += scores[k] * wt; w += wt; }
  }
  return w ? Math.round(total / w) : 0;
}

export const LOW_ADVICE = {
  technical: 'Technical depth was thin. Name the concrete mechanisms, tools and trade-offs behind your choices.',
  communication: 'Answers were hard to follow. Lead with the point, keep it concise, and finish with the outcome.',
  problemSolving: 'Your reasoning was not visible. Explain the alternatives you considered and why you chose one.',
  confidence: 'Hedging ("maybe", "I guess") weakened your answers. State clearly what you did and decided.',
  roleKnowledge: 'Answers did not connect to the role. Mention the technologies and responsibilities the job emphasises.',
  structure: 'Answers lacked structure. Use Situation → Action → Result, or Context → Approach → Trade-offs → Outcome.',
};
export const HIGH_NOTE = {
  technical: 'Strong technical content with concrete detail.',
  communication: 'Clear, well-paced explanations.',
  problemSolving: 'Good visible reasoning and trade-off thinking.',
  confidence: 'Direct, assured delivery.',
  roleKnowledge: 'Answers connected well to the role and its skills.',
  structure: 'Answers were well structured and easy to follow.',
};
