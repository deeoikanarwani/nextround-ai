import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { mailEnabled, sendWelcomeEmail, sendLoginAlert, sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/mail.service.js';
import * as account from '../services/account.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8, 'must be at least 8 characters').max(100),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  level: z.enum(['student', 'fresher', 'experienced']).optional(),
  targetRoles: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  onboarded: z.boolean().optional(),
});
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(100) });
export const verifyEmailSchema = z.object({ token: z.string().min(1) });
export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email().max(120) });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8, 'must be at least 8 characters').max(100) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(8, 'must be at least 8 characters').max(100),
});

const sign = (user) => jwt.sign({ id: user._id, tokenVersion: user.tokenVersion ?? 0 }, env.jwtSecret, { expiresIn: env.jwtExpires });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.lookupByEmail(email)) throw new AppError(409, 'An account with this email already exists.');
  const verificationEnabled = mailEnabled();
  const user = await User.register({ name, email, emailVerified: !verificationEnabled, passwordHash: await bcrypt.hash(password, 10) });
  if (verificationEnabled) {
    const verification = await account.startEmailVerification(user._id);
    void sendVerificationEmail(verification.user, verification.token).catch(() => {
      console.warn('Mail warning: verification email failed.');
    });
  }
  void sendWelcomeEmail(user).catch(() => {
    console.warn('Mail warning: welcome email failed.');
  });
  res.status(201).json({ token: sign(user), user: user.toPublic() });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.lookupByEmailWithPassword(req.body.email);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new AppError(401, 'Invalid email or password.');

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 100);
  const shouldSendAlert = await User.shouldSendLoginAlert(user._id);
  if (shouldSendAlert) {
    const didSend = await User.markLoginAlertSent(user._id);
    if (didSend) {
      void sendLoginAlert(user, { ip, userAgent }).catch(() => {
        console.warn('Mail warning: login alert failed.');
      });
    }
  }

  res.json({ token: sign(user), user: user.toPublic() });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await account.verifyEmail(req.body.token);
  res.json({ ok: true, message: 'Your email has been verified.' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const verification = await account.startEmailVerification(req.user._id);
  void sendVerificationEmail(verification.user, verification.token).catch(() => {
    console.warn('Mail warning: verification email failed.');
  });
  res.json({ ok: true, message: 'Verification email sent.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const reset = await account.requestPasswordReset(req.body.email);
  if (reset) {
    void sendPasswordResetEmail(reset.user, reset.token).catch(() => {
      console.warn('Mail warning: password reset email failed.');
    });
  }
  res.json({ message: 'If that email exists, we sent a reset link' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await account.resetPassword(req.body.token, req.body.password);
  void sendPasswordChangedEmail(user).catch(() => {
    console.warn('Mail warning: password change email failed.');
  });
  res.json({ ok: true, message: 'Your password was reset.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await account.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  void sendPasswordChangedEmail(user).catch(() => {
    console.warn('Mail warning: password change email failed.');
  });
  res.json({ token: sign(user), user: user.toPublic() });
});

export const me = (req, res) => res.json({ user: req.user.toPublic() });

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.updateProfile(req.user._id, req.body);
  res.json({ user: user.toPublic() });
});

export const deleteMyData = asyncHandler(async (req, res) => {
  await User.clearAccountData(req.user._id);
  res.json({ ok: true });
});

export const deleteMe = asyncHandler(async (req, res) => {
  const user = await User.getForAuth(req.user._id);
  if (!(await bcrypt.compare(req.body.password, user.passwordHash))) throw new AppError(403, 'Password is incorrect.');
  await User.clearAccountData(user._id);
  await User.removeById(user._id);
  res.json({ ok: true });
});
