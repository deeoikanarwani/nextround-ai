

https://github.com/user-attachments/assets/4a50809b-9d92-4100-9978-431b7161b530

NextRound AI — your personal AI interview coach
Full-stack MVP: React (Vite) + Zustand frontend, Node/Express + MongoDB (Mongoose) backend, Gemini behind an AI service abstraction. 100% free-tier friendly.

Flow: Register → Onboarding → Upload resume → Add target job → Match → AI interview (adaptive follow-ups) → Report → Readiness → Targeted practice → Progress.

1. Requirements
Node.js 18+ (20 or 22 recommended)
MongoDB — either:
Local: install MongoDB Community and start it (default mongodb://127.0.0.1:27017), or
Free cloud: create a free MongoDB Atlas M0 cluster, allow your IP, copy the connection string.
(Optional) free Gemini key from https://aistudio.google.com/apikey. Without it the app still works using built-in rule-based AI (questions, scoring, resume/job analysis).
2. Setup
npm run install:all          # installs root, server, client
A ready server/.env is included (local MongoDB). Edit it if needed:

MONGODB_URI=mongodb://127.0.0.1:27017/nextround   # or your Atlas URI
GEMINI_API_KEY=                                   # optional
3. Run (VS Code terminal)
npm run dev
Frontend: http://localhost:5173
API: http://localhost:5000/api/health
Open the frontend, click Start Practicing, register, and follow the flow.

4. Verify
npm --prefix server run check   # offline smoke test (logic + auth/validation), no DB needed
npm run build                   # production frontend build
5. Project structure
server/src
  config/        env + MongoDB connection
  models/        User, Resume, Job, Interview, Usage
  middleware/    auth (JWT), validation (zod), error handling
  controllers/   auth, resume, job, interview, insights (dashboard/analytics)
  services/      ai (Gemini), resume, job, interview (adaptive engine), report (readiness), usage (quotas), questions
  routes/        API routes
client/src
  pages/         Landing, Auth, Onboarding, Dashboard, Resume, Jobs, InterviewSetup, InterviewLive, Reports, Report, Analytics, Settings
  components/    Layout + UI primitives (rings, bars, charts)
  store.js       Zustand auth store · api.js axios client
6. How the key features work
Adaptive interview: after every answer the engine evaluates it, adjusts difficulty, and asks the next question using the previous answer (Gemini, or a skill-aware follow-up fallback).
Explainable scores: technical, communication, problem solving, confidence, role knowledge, structure — each with strengths/improvements.
Readiness: recency-weighted over your last 5 interviews, with "why" and one next best action.
Weakness → practice: report recommends targeted practice; the new report shows before → after for that skill.
Resume ↔ job match: deterministic and explainable (matched / missing skills, interview focus).
Security: bcrypt, JWT, zod validation, helmet, rate limits, per-user ownership on every query, PDF magic-byte + size validation, resumes stored as extracted text in your DB (never public), delete resume/interview/job/all data/account.
Backend-enforced quotas (per user, per day; configurable in .env): interviews, resume analyses, job analyses, AI calls. Prompt/answer/resume sizes are capped.
7. Free deployment
Database: MongoDB Atlas M0 (free).
npm run build creates client/dist; the Express server serves it automatically, so one free Node host (e.g. Render free web service) runs everything.
Set env vars on the host: MONGODB_URI, JWT_SECRET, CLIENT_URL, NODE_ENV=production, optional GEMINI_API_KEY. Build: npm run install:all && npm run build. Start: npm start. Free tiers sleep when idle and have limits; nothing here requires billing.
8. Not included (future scope)
Voice interviews, recruiter mode, public shareable profile, company-specific prep.








