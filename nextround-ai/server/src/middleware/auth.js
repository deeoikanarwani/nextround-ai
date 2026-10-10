import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'Please sign in to continue.');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }
  const user = await User.getForAuth(payload.id);
  if (!user) throw new AppError(401, 'Account not found. Please sign in again.');
  if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) throw new AppError(401, 'Your session has expired. Please sign in again.');
  req.user = user;
  next();
});
