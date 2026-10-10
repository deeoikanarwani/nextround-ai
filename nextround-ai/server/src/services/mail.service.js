import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport = null;

export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getTransport = () => {
  const { host, port, user, pass } = env.smtp;
  if (!host || !user || !pass) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host,
      port: Number(port) || 465,
      secure: Number(port || 465) === 465,
      auth: { user, pass },
    });
  }
  return transport;
};

export const mailEnabled = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const renderEmail = ({ title, heading, bodyLines, accent = '#5b4bdb' }) => {
  const lines = bodyLines.map((line) => `<p style="margin:0 0 12px; color:#1f2937; font-size:15px; line-height:1.6;">${line}</p>`).join('');
  return `
    <div style="margin:0; padding:24px; background:#f4f6fb; font-family:Arial, sans-serif; color:#111827;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb; box-shadow:0 10px 30px rgba(17,24,39,0.07);">
        <div style="padding:20px 24px; background:${accent}; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.02em;">NextRound AI</div>
        <div style="padding:28px 24px 24px;">
          <h2 style="margin:0 0 12px; font-size:26px; color:#111827;">${escapeHtml(title)}</h2>
          <p style="margin:0 0 18px; color:#4b5563; font-size:15px;">${escapeHtml(heading)}</p>
          ${lines}
        </div>
      </div>
    </div>
  `;
};

export const sendWelcomeEmail = async (user) => {
  const transporter = getTransport();
  if (!transporter || !user?.email) return undefined;

  const recipient = user.email;
  const name = user.name || 'there';
  const subject = 'Welcome to NextRound AI';
  const text = `Hi ${name},\n\nWelcome to NextRound AI. We are excited to help you prepare for your next interview.\n\nYour account is ready to use.\n\nThanks,\nNextRound AI`;
  const html = renderEmail({
    title: 'Welcome aboard!',
    heading: `Hi ${escapeHtml(name)}, welcome to NextRound AI.`,
    bodyLines: [
      'Your account is ready, and your next interview practice session can start right away.',
      'Use your resume, job descriptions, and interview practice tools to sharpen your readiness before you walk in.',
      'Thanks for choosing NextRound AI.',
    ],
  });

  return transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to: recipient,
    subject,
    text,
    html,
  });
};

export const sendVerificationEmail = async (user, token) => {
  const transporter = getTransport();
  if (!transporter || !user?.email) return undefined;

  const link = `${env.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const name = user.name || 'there';
  return transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to: user.email,
    subject: 'Verify your NextRound AI email',
    text: `Hi ${name},\n\nPlease verify your email address to finish setting up your NextRound AI account:\n${link}\n\nThis link expires in 24 hours.`,
    html: renderEmail({
      title: 'Verify your email',
      heading: `Hi ${escapeHtml(name)}, confirm this email address for your account.`,
      bodyLines: [
        ` <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;background:#5b4bdb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify email</a>`,
        'This link expires in 24 hours.',
      ],
    }),
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const transporter = getTransport();
  if (!transporter || !user?.email) return undefined;

  const link = `${env.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const name = user.name || 'there';
  return transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to: user.email,
    subject: 'Reset your NextRound AI password',
    text: `Hi ${name},\n\nUse this link to choose a new password for your NextRound AI account:\n${link}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
    html: renderEmail({
      title: 'Reset your password',
      heading: `Hi ${escapeHtml(name)}, we received a password reset request.`,
      bodyLines: [
        `<a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;background:#5b4bdb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Choose a new password</a>`,
        'This link expires in 30 minutes. If you did not request this, you can ignore this email.',
      ],
    }),
  });
};

export const sendPasswordChangedEmail = async (user) => {
  const transporter = getTransport();
  if (!transporter || !user?.email) return undefined;

  const name = user.name || 'there';
  const resetLink = `${env.clientUrl}/forgot-password`;
  return transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to: user.email,
    subject: 'Your password was changed',
    text: `Hi ${name},\n\nThe password for your NextRound AI account was changed. If this was not you, reset your password here: ${resetLink}`,
    html: renderEmail({
      title: 'Your password was changed',
      heading: `Hi ${escapeHtml(name)}, the password for your NextRound AI account was changed.`,
      bodyLines: [
        `If this was not you, <a href="${escapeHtml(resetLink)}">request a password reset</a>.`,
      ],
    }),
  });
};

export const sendLoginAlert = async (user, { ip, userAgent } = {}) => {
  const transporter = getTransport();
  if (!transporter || !user?.email) return undefined;

  const now = new Date();
  const utcStamp = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const istStamp = istDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' IST');
  const ipValue = ip || 'unknown';
  const rawAgent = String(userAgent || 'Unknown device').slice(0, 100);
  const sanitizedName = escapeHtml(user.name || 'there');
  const sanitizedIp = escapeHtml(ipValue);
  const sanitizedAgent = escapeHtml(rawAgent);
  const contact = env.smtp.from || env.smtp.user || 'support@example.com';
  const resetLink = `${env.clientUrl}/forgot-password`;
  const subject = 'New sign-in to your NextRound AI account';
  const text = [
    `Hi ${user.name || 'there'},`,
    '',
    'A new sign-in was detected for your NextRound AI account.',
    `Time (UTC): ${utcStamp}`,
    `Time (IST): ${istStamp}`,
    `IP address: ${ipValue}`,
    `Browser/device: ${rawAgent}`,
    '',
    `If this was not you, please contact ${contact}.`,
    `Not you? Reset your password: ${resetLink}`,
    '',
    'No passwords or tokens were included in this email.',
  ].join('\n');

  const html = renderEmail({
    title: 'Security alert',
    heading: `Hi ${sanitizedName}, we detected a new sign-in to your account.`,
    bodyLines: [
      `This sign-in happened at <strong>${escapeHtml(utcStamp)}</strong> UTC and <strong>${escapeHtml(istStamp)}</strong> IST.`,
      `IP address: <strong>${sanitizedIp}</strong>`,
      `Browser/device: <strong>${sanitizedAgent}</strong>`,
      `If this was not you, please contact <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a>.`,
      `<a href="${escapeHtml(resetLink)}">Not you? Reset your password</a>`,
      'We do not include passwords, tokens, or other secret values in these emails.',
    ],
  });

  return transporter.sendMail({
    from: env.smtp.from || env.smtp.user,
    to: user.email,
    subject,
    text,
    html,
  });
};
