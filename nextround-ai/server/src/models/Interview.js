import mongoose from 'mongoose';

const turnSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    topic: { type: String, default: '' },
    difficulty: { type: String, default: 'intermediate' },
    followUp: { type: Boolean, default: false },
    answer: { type: String, default: '' },
    evaluation: { type: mongoose.Schema.Types.Mixed, default: null },
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date },
  },
  { _id: true }
);

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, required: true },
    persona: { type: String, default: 'professional' },
    difficulty: { type: String, default: 'intermediate' },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    project: { name: String, tech: [String], description: String },
    focus: { type: String, default: '' },
    total: { type: Number, default: 5 },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    turns: [turnSchema],
    report: { type: mongoose.Schema.Types.Mixed, default: null },
    overall: { type: Number, default: null },
    completedAt: Date,
  },
  { timestamps: true }
);

interviewSchema.index({ user: 1, createdAt: -1 });
interviewSchema.index({ user: 1, status: 1, createdAt: -1 });

interviewSchema.statics.getByIdForUser = function (userId, id, select) {
  const query = this.findOne({ _id: id, user: userId });
  return select ? query.select(select) : query;
};

interviewSchema.statics.saveDocument = function (interview) {
  return interview.save();
};

interviewSchema.statics.allForUser = function (userId, filter = {}, options = {}) {
  const query = this.find({ user: userId, ...filter }).sort(options.sort || { createdAt: -1 });
  if (options.skip) query.skip(options.skip);
  if (options.limit) query.limit(options.limit);
  if (options.select) query.select(options.select);
  return query;
};

interviewSchema.statics.totalForUser = function (userId, filter = {}) {
  return this.countDocuments({ user: userId, ...filter });
};

interviewSchema.statics.latestCompletedForUser = function (userId, select) {
  const query = this.findOne({ user: userId, status: 'completed' }).sort({ createdAt: -1 });
  return select ? query.select(select) : query;
};

interviewSchema.statics.previousCompletedForUser = function (userId, excludeId, limit = 5, select = 'report.scores') {
  return this.find({ user: userId, status: 'completed', _id: { $ne: excludeId } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(select);
};

interviewSchema.statics.removeForUser = function (userId, id) {
  return this.deleteOne({ _id: id, user: userId });
};

interviewSchema.statics.clearAllForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

export default mongoose.model('Interview', interviewSchema);
