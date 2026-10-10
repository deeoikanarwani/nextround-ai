import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';

try {
  await mongoose.connect(env.mongoUri);
  const result = await User.markExistingUsersVerified();
  console.log(`Updated ${result.modifiedCount} existing users as verified.`);
} catch (error) {
  console.error('Email verification migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}