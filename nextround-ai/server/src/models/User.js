import mongoose from 'mongoose';
import Resume from './Resume.js';
import Job from './Job.js';
import Interview from './Interview.js';
import Usage from './Usage.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    level: { type: String, enum: ['student', 'fresher', 'experienced'], default: 'fresher' },
    targetRoles: { type: [String], default: [] },
    onboarded: { type: Boolean, default: false },
    lastLoginAlertAt: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    verifyTokenHash: { type: String, select: false },
    verifyTokenExpires: { type: Date, select: false },
    verifyEmailSentAt: { type: Date, default: null },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    resetRequestedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, level: this.level, targetRoles: this.targetRoles, onboarded: this.onboarded, emailVerified: this.emailVerified };
};

userSchema.statics.lookupByEmail = function (email) {
  return this.findOne({ email });
};

userSchema.statics.lookupByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+passwordHash');
};

userSchema.statics.getForAuth = function (id) {
  return this.findById(id).select('+passwordHash');
};

userSchema.statics.getForAccountAction = function (id) {
  return this.findById(id);
};

userSchema.statics.getForPasswordChange = function (id) {
  return this.findById(id).select('+passwordHash');
};

userSchema.statics.updateProfile = function (id, fields) {
  return this.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true });
};

userSchema.statics.getTokenStateForUser = function (id) {
  return this.findById(id).select('+verifyTokenHash +resetTokenHash');
};

userSchema.statics.register = function (payload) {
  return this.create(payload);
};

userSchema.statics.removeById = function (id) {
  return this.deleteOne({ _id: id });
};

userSchema.statics.removeManyByIds = function (ids) {
  return this.deleteMany({ _id: { $in: ids } });
};

userSchema.statics.clearAccountData = async function (userId) {
  await Promise.all([
    Resume.clearAllForUser(userId),
    Job.clearAllForUser(userId),
    Interview.clearAllForUser(userId),
    Usage.clearAllForUser(userId),
  ]);
};

userSchema.statics.shouldSendLoginAlert = function (userId) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  return this.exists({
    _id: userId,
    $or: [{ lastLoginAlertAt: null }, { lastLoginAlertAt: { $exists: false } }, { lastLoginAlertAt: { $lt: cutoff } }],
  });
};

userSchema.statics.markLoginAlertSent = function (userId) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  return this.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ lastLoginAlertAt: null }, { lastLoginAlertAt: { $exists: false } }, { lastLoginAlertAt: { $lt: cutoff } }],
    },
    { $set: { lastLoginAlertAt: new Date() } },
    { new: true }
  );
};

userSchema.statics.setVerifyToken = function (userId, tokenHash, expiresAt, sentAt, sentBefore) {
  return this.findOneAndUpdate(
    {
      _id: userId,
      emailVerified: false,
      $or: [{ verifyEmailSentAt: null }, { verifyEmailSentAt: { $exists: false } }, { verifyEmailSentAt: { $lte: sentBefore } }],
    },
    { $set: { verifyTokenHash: tokenHash, verifyTokenExpires: expiresAt, verifyEmailSentAt: sentAt } },
    { new: true }
  );
};

userSchema.statics.consumeVerifyToken = function (tokenHash, now = new Date()) {
  return this.findOneAndUpdate(
    { verifyTokenHash: tokenHash, verifyTokenExpires: { $gt: now }, emailVerified: false },
    { $set: { emailVerified: true }, $unset: { verifyTokenHash: 1, verifyTokenExpires: 1 } },
    { new: true }
  );
};

userSchema.statics.expireVerifyTokenForUser = function (userId) {
  return this.updateOne({ _id: userId, emailVerified: false }, { $set: { verifyTokenExpires: new Date(0) } });
};

userSchema.statics.setResetToken = function (userId, tokenHash, expiresAt, requestedAt, requestedBefore) {
  return this.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ resetRequestedAt: null }, { resetRequestedAt: { $exists: false } }, { resetRequestedAt: { $lte: requestedBefore } }],
    },
    { $set: { resetTokenHash: tokenHash, resetTokenExpires: expiresAt, resetRequestedAt: requestedAt } },
    { new: true }
  );
};

userSchema.statics.consumeResetToken = function (tokenHash, passwordHash, now = new Date()) {
  return this.findOneAndUpdate(
    { resetTokenHash: tokenHash, resetTokenExpires: { $gt: now } },
    {
      $set: { passwordHash },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  ).select('+passwordHash');
};

userSchema.statics.changePasswordAndBumpVersion = function (userId, passwordHash) {
  return this.findOneAndUpdate(
    { _id: userId },
    {
      $set: { passwordHash },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );
};

userSchema.statics.markExistingUsersVerified = function () {
  return this.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } });
};

userSchema.statics.setEmailVerified = function (userId, emailVerified) {
  return this.updateOne({ _id: userId }, { $set: { emailVerified } });
};

export default mongoose.model('User', userSchema);
