import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const createToken = () => randomBytes(32).toString('hex');

export const startEmailVerification = async (userId) => {
  const user = await User.getForAccountAction(userId);
  if (!user) throw new AppError(404, 'Account not found.');
  if (user.emailVerified) throw new AppError(400, 'Your email is already verified.');

  const now = new Date();
  const token = createToken();
  const updated = await User.setVerifyToken(
    userId,
    hashToken(token),
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    now,
    new Date(now.getTime() - 60 * 1000)
  );
  if (!updated) {
    const latest = await User.getForAccountAction(userId);
    if (latest?.emailVerified) throw new AppError(400, 'Your email is already verified.');
    throw new AppError(429, 'Please wait 60 seconds before requesting another verification email.');
  }
  return { token, user: { name: updated.name, email: updated.email } };
};

export const verifyEmail = async (token) => {
  const user = await User.consumeVerifyToken(hashToken(token));
  if (!user) throw new AppError(400, 'This verification link is invalid or has expired.');
  return user;
};

export const requestPasswordReset = async (email) => {
  const user = await User.lookupByEmail(email);
  if (!user) return null;

  const now = new Date();
  const token = createToken();
  const updated = await User.setResetToken(
    user._id,
    hashToken(token),
    new Date(now.getTime() + 30 * 60 * 1000),
    now,
    new Date(now.getTime() - 60 * 1000)
  );
  if (!updated) return null;
  return { token, user: { name: updated.name, email: updated.email } };
};

export const resetPassword = async (token, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await User.consumeResetToken(hashToken(token), passwordHash);
  if (!user) throw new AppError(400, 'This password reset link is invalid or has expired.');
  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.getForPasswordChange(userId);
  if (!user) throw new AppError(404, 'Account not found.');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(403, 'Current password is incorrect.');
  if (await bcrypt.compare(newPassword, user.passwordHash)) throw new AppError(400, 'New password must be different from your current password.');

  const updated = await User.changePasswordAndBumpVersion(userId, await bcrypt.hash(newPassword, 10));
  if (!updated) throw new AppError(404, 'Account not found.');
  return updated;
};
