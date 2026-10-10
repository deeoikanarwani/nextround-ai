import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    return next(new AppError(400, msg));
  }
  req.body = result.data;
  next();
};

export const validId = (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : next(new AppError(400, 'Invalid id.'));
