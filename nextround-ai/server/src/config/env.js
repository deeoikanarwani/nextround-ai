import 'dotenv/config';

const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nextround',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '',
  },
  limits: {
    aiCallsPerDay: num(process.env.LIMIT_AI_CALLS_PER_DAY, 60),
    interviewsPerDay: num(process.env.LIMIT_INTERVIEWS_PER_DAY, 6),
    resumeAnalysesPerDay: num(process.env.LIMIT_RESUME_ANALYSES_PER_DAY, 5),
    jobAnalysesPerDay: num(process.env.LIMIT_JOB_ANALYSES_PER_DAY, 10),
    maxAnswerChars: 3000,
    maxResumeChars: 12000,
    maxJdChars: 8000,
    maxPromptChars: 14000,
    maxFileBytes: 2 * 1024 * 1024,
  },
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('Set JWT_SECRET in production.');
}
