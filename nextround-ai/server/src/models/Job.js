import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    company: { type: String, default: '', maxlength: 120 },
    description: { type: String, required: true, select: false },
    analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
    match: { type: mongoose.Schema.Types.Mixed, default: null },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  },
  { timestamps: true }
);

jobSchema.statics.addForUser = function (userId, payload) {
  return this.create({ user: userId, ...payload });
};

jobSchema.statics.getByIdForUser = function (userId, id, select) {
  const query = this.findOne({ _id: id, user: userId });
  return select ? query.select(select) : query;
};

jobSchema.statics.updateMatchForUser = function (userId, id, match, resumeId) {
  return this.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { match, resume: resumeId } },
    { new: true, runValidators: true }
  );
};

jobSchema.statics.latestForUser = function (userId, select) {
  const query = this.findOne({ user: userId }).sort({ createdAt: -1 });
  return select ? query.select(select) : query;
};

jobSchema.statics.allForUser = function (userId, limit = 30, select) {
  const query = this.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return select ? query.select(select) : query;
};

jobSchema.statics.removeForUser = function (userId, id) {
  return this.deleteOne({ _id: id, user: userId });
};

jobSchema.statics.clearAllForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

export default mongoose.model('Job', jobSchema);
