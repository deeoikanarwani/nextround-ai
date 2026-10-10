import { AppError } from '../utils/errors.js';

export function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) return next(new AppError(403, 'Please verify your email first', 'EMAIL_NOT_VERIFIED'));
  next();
}