import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireVerified } from '../middleware/verified.js';
import { validate, validId } from '../middleware/validate.js';
import { env } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';
import * as resume from '../controllers/resume.controller.js';
import * as job from '../controllers/job.controller.js';
import * as iv from '../controllers/interview.controller.js';
import * as insights from '../controllers/insights.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.limits.maxFileBytes, files: 1 } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'You are going too fast. Wait a moment and try again.' } });

router.param('id', validId);
router.get('/health', (req, res) => res.json({ ok: true }));

// auth
router.post('/auth/register', authLimiter, validate(auth.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(auth.loginSchema), auth.login);
router.post('/auth/verify-email', authLimiter, validate(auth.verifyEmailSchema), auth.verifyEmail);
router.post('/auth/forgot-password', authLimiter, validate(auth.forgotPasswordSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(auth.resetPasswordSchema), auth.resetPassword);
router.post('/auth/resend-verification', authLimiter, requireAuth, auth.resendVerification);
router.post('/auth/change-password', authLimiter, requireAuth, validate(auth.changePasswordSchema), auth.changePassword);
router.post('/auth/logout', (req, res) => res.json({ ok: true }));
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, validate(auth.profileSchema), auth.updateMe);
router.delete('/auth/me/data', requireAuth, auth.deleteMyData);
router.delete('/auth/me', requireAuth, validate(auth.deleteAccountSchema), auth.deleteMe);

// everything below needs a signed-in user
router.use(requireAuth);
router.get('/dashboard', insights.dashboard);
router.get('/analytics', insights.analytics);

router.get('/resumes', resume.list);
router.post('/resumes', requireVerified, aiLimiter, upload.single('file'), validate(resume.textSchema), resume.create);
router.get('/resumes/:id', resume.get);
router.delete('/resumes/:id', resume.remove);

router.get('/jobs', job.list);
router.post('/jobs', requireVerified, aiLimiter, validate(job.createSchema), job.create);
router.get('/jobs/:id', job.get);
router.post('/jobs/:id/match', validate(job.matchSchema), job.rematch);
router.delete('/jobs/:id', job.remove);

router.get('/interviews', iv.list);
router.post('/interviews', requireVerified, aiLimiter, validate(iv.createSchema), iv.create);
router.get('/interviews/:id', iv.get);
router.post('/interviews/:id/answer', requireVerified, aiLimiter, validate(iv.answerSchema), iv.answer);
router.post('/interviews/:id/finish', iv.finish);
router.delete('/interviews/:id', iv.remove);

export default router;
