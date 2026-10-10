import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { aiEnabled } from './services/ai.service.js';

try {
  await connectDB();
} catch (e) {
  console.error('\nCould not connect to MongoDB:', e.message);
  console.error('Start MongoDB locally, or set MONGODB_URI in server/.env (free Atlas M0 works).\n');
  process.exit(1);
}
app.listen(env.port, () => {
  console.log(`NextRound API on http://localhost:${env.port}  |  AI: ${aiEnabled() ? `Gemini (${env.geminiModel})` : 'built-in heuristics (set GEMINI_API_KEY for Gemini)'}`);
});
