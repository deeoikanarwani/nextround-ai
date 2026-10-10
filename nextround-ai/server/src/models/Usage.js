import mongoose from 'mongoose';

const today = () => new Date().toISOString().slice(0, 10);

const usageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  aiCalls: { type: Number, default: 0 },
  interviews: { type: Number, default: 0 },
  resumeAnalyses: { type: Number, default: 0 },
  jobAnalyses: { type: Number, default: 0 },
});
usageSchema.index({ user: 1, day: 1 }, { unique: true });

usageSchema.statics.todayForUser = function (userId) {
  return this.findOne({ user: userId, day: today() }).lean();
};

usageSchema.statics.snapshotForUserDay = function (userId, day) {
  return this.findOne({ user: userId, day }).lean();
};

usageSchema.statics.consumeForUser = async function (userId, key, limit) {
  const day = today();
  const attempt = () => this.findOneAndUpdate({ user: userId, day, [key]: { $lt: limit } }, { $inc: { [key]: 1 } }, { new: true });
  let doc = await attempt();
  if (doc) return doc;
  try {
    await this.create({ user: userId, day });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  doc = await attempt();
  return doc || null;
};

usageSchema.statics.clearAllForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

export default mongoose.model('Usage', usageSchema);
