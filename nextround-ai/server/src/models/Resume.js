import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'My resume', maxlength: 120 },
    fileName: { type: String, default: '' },
    text: { type: String, required: true, select: false }, // never returned in lists; never logged
    analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

resumeSchema.statics.addForUser = function (userId, payload) {
  return this.create({ user: userId, ...payload });
};

resumeSchema.statics.getByIdForUser = function (userId, id, select) {
  const query = this.findOne({ _id: id, user: userId });
  return select ? query.select(select) : query;
};

resumeSchema.statics.latestForUser = function (userId, select) {
  const query = this.findOne({ user: userId }).sort({ createdAt: -1 });
  return select ? query.select(select) : query;
};

resumeSchema.statics.allForUser = function (userId, limit = 20, select) {
  const query = this.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return select ? query.select(select) : query;
};

resumeSchema.statics.removeForUser = function (userId, id) {
  return this.deleteOne({ _id: id, user: userId });
};

resumeSchema.statics.clearAllForUser = function (userId) {
  return this.deleteMany({ user: userId });
};

export default mongoose.model('Resume', resumeSchema);
