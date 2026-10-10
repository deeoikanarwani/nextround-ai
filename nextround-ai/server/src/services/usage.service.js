import Usage from '../models/Usage.js';
import { AppError } from '../utils/errors.js';

/** Atomically consume one unit of a daily quota. Throws 429 when the limit is reached. */
export async function consume(userId, key, limit) {
  const doc = await Usage.consumeForUser(userId, key, limit);
  if (!doc) throw new AppError(429, `Daily limit reached for this action (${limit}/day). Try again tomorrow.`, 'QUOTA');
  return doc;
}

export async function getUsage(userId) {
  return (await Usage.todayForUser(userId)) || { aiCalls: 0, interviews: 0, resumeAnalyses: 0, jobAnalyses: 0 };
}
