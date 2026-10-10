import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { changePassword, requestPasswordReset, resetPassword, startEmailVerification, verifyEmail } from '../src/services/account.service.js';

Object.assign(env.smtp, { host: '', user: '', pass: '', from: '' });
const password = 'InitialPass123!';
const users = [];
let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

async function expectServiceError(action, status) {
  await assert.rejects(action, (error) => error.status === status);
}

async function authStatus(base, token) {
  const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return response.status;
}

let httpServer;
try {
  await mongoose.connect(env.mongoUri);
  const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const user = await User.register({ name: 'Auth Flow', email: `auth_flow_${stamp}@example.com`, passwordHash: 'placeholder', emailVerified: false });
  const expiredUser = await User.register({ name: 'Expired Flow', email: `auth_expired_${stamp}@example.com`, passwordHash: 'placeholder', emailVerified: false });
  users.push(user._id, expiredUser._id);

  let verification;
  await check('verify with a valid token works and stored token is hashed', async () => {
    verification = await startEmailVerification(user._id);
    const state = await User.getTokenStateForUser(user._id);
    assert.match(state.verifyTokenHash, /^[a-f0-9]{64}$/);
    assert.notEqual(state.verifyTokenHash, verification.token);
    const verified = await verifyEmail(verification.token);
    assert.equal(verified.emailVerified, true);
  });

  await check('verifying twice fails', () => expectServiceError(() => verifyEmail(verification.token), 400));

  let expiredVerification;
  await check('expired verification token fails', async () => {
    expiredVerification = await startEmailVerification(expiredUser._id);
    await User.expireVerifyTokenForUser(expiredUser._id);
    await expectServiceError(() => verifyEmail(expiredVerification.token), 400);
  });

  await check('forgot password for unknown email returns no account data', async () => {
    const result = await requestPasswordReset(`missing_${stamp}@example.com`);
    assert.equal(result, null);
  });

  const oldResetJwt = jwt.sign({ id: user._id, tokenVersion: user.tokenVersion ?? 0 }, env.jwtSecret, { expiresIn: '1h' });
  let reset;
  let resetUser;
  await check('reset with valid token works and token hash is stored', async () => {
    reset = await requestPasswordReset(user.email);
    assert.ok(reset?.token);
    const state = await User.getTokenStateForUser(user._id);
    assert.match(state.resetTokenHash, /^[a-f0-9]{64}$/);
    assert.notEqual(state.resetTokenHash, reset.token);
    resetUser = await resetPassword(reset.token, 'ResetPass123!');
    assert.equal(resetUser.tokenVersion, 1);
  });

  await check('old reset token fails after consumption', () => expectServiceError(() => resetPassword(reset.token, 'AnotherPass123!'), 400));
  await check('resetting twice with the same token fails', () => expectServiceError(() => resetPassword(reset.token, 'AnotherPass123!'), 400));

  httpServer = app.listen(0);
  const base = `http://127.0.0.1:${httpServer.address().port}/api`;
  await check('old JWT is rejected and new JWT works after reset', async () => {
    const newJwt = jwt.sign({ id: user._id, tokenVersion: resetUser.tokenVersion }, env.jwtSecret, { expiresIn: '1h' });
    assert.equal(await authStatus(base, oldResetJwt), 401);
    assert.equal(await authStatus(base, newJwt), 200);
  });

  await check('wrong current password fails with 403', () => expectServiceError(() => changePassword(user._id, 'WrongPass123!', 'ChangedPass123!'), 403));
  await check('new password equal to current password fails with 400', () => expectServiceError(() => changePassword(user._id, 'ResetPass123!', 'ResetPass123!'), 400));

  const oldChangeJwt = jwt.sign({ id: user._id, tokenVersion: resetUser.tokenVersion }, env.jwtSecret, { expiresIn: '1h' });
  let changedUser;
  await check('change password invalidates old JWT and accepts a new JWT', async () => {
    changedUser = await changePassword(user._id, 'ResetPass123!', 'ChangedPass123!');
    const newJwt = jwt.sign({ id: user._id, tokenVersion: changedUser.tokenVersion }, env.jwtSecret, { expiresIn: '1h' });
    assert.equal(await authStatus(base, oldChangeJwt), 401);
    assert.equal(await authStatus(base, newJwt), 200);
  });
} catch (error) {
  failed++;
  console.log(`FAIL auth flow setup: ${error.message}`);
} finally {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (users.length) await User.removeManyByIds(users);
  await mongoose.disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
