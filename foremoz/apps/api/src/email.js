import nodemailer from 'nodemailer';
import { config } from './config.js';

let transporterPromise = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function isEmailDeliveryEnabled() {
  return Boolean(
    config.emailEnabled &&
      config.emailFromAddress &&
      config.emailSmtpHost &&
      config.emailSmtpPort
  );
}

function toFromHeader() {
  return `"${config.emailFromName}" <${config.emailFromAddress}>`;
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.emailSmtpHost,
        port: config.emailSmtpPort,
        secure: config.emailSmtpSecure,
        auth:
          config.emailSmtpUser || config.emailSmtpPass
            ? {
                user: config.emailSmtpUser || undefined,
                pass: config.emailSmtpPass || undefined
              }
            : undefined,
        tls: config.emailSmtpIgnoreTlsErrors
          ? {
              rejectUnauthorized: false
            }
          : undefined
      })
    );
  }
  return transporterPromise;
}

async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient) {
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }
  if (!isEmailDeliveryEnabled()) {
    return { sent: false, skipped: true, reason: 'email_disabled_or_not_configured' };
  }
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: toFromHeader(),
      to: recipient,
      replyTo: config.emailReplyTo || undefined,
      subject,
      text,
      html
    });
    return {
      sent: true,
      skipped: false,
      messageId: info.messageId || null
    };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      reason: String(error?.message || 'failed_to_send_email')
    };
  }
}

export async function sendMemberSignupEmail({ email, fullName, memberId, tenantId }) {
  const safeName = String(fullName || '').trim() || 'Member';
  const safeMemberId = String(memberId || '').trim() || '-';
  const safeTenantId = String(tenantId || '').trim() || '-';
  const subject = `Welcome to Foremoz, ${safeName}`;
  const text = [
    `Hi ${safeName},`,
    '',
    'Akun member kamu sudah aktif.',
    `Tenant ID: ${safeTenantId}`,
    `Member ID: ${safeMemberId}`,
    '',
    'Silakan login untuk mulai pakai Foremoz.',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Akun member kamu sudah aktif.</p>
    <p>
      <strong>Tenant ID:</strong> ${escapeHtml(safeTenantId)}<br />
      <strong>Member ID:</strong> ${escapeHtml(safeMemberId)}
    </p>
    <p>Silakan login untuk mulai pakai Foremoz.</p>
    <p>Foremoz Team</p>
  `;
  return sendEmail({ to: email, subject, text, html });
}

export async function sendTenantSignupEmail({ email, fullName, role, tenantId }) {
  const safeName = String(fullName || '').trim() || 'Owner';
  const safeRole = String(role || 'owner').trim() || 'owner';
  const safeTenantId = String(tenantId || '').trim() || '-';
  const subject = `Tenant account ready: ${safeTenantId}`;
  const text = [
    `Hi ${safeName},`,
    '',
    'Akun tenant Foremoz kamu sudah aktif.',
    `Tenant ID: ${safeTenantId}`,
    `Role: ${safeRole}`,
    '',
    'Silakan login ke dashboard Foremoz.',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Akun tenant Foremoz kamu sudah aktif.</p>
    <p>
      <strong>Tenant ID:</strong> ${escapeHtml(safeTenantId)}<br />
      <strong>Role:</strong> ${escapeHtml(safeRole)}
    </p>
    <p>Silakan login ke dashboard Foremoz.</p>
    <p>Foremoz Team</p>
  `;
  return sendEmail({ to: email, subject, text, html });
}

export async function sendEventRegistrationEmail({
  email,
  fullName,
  eventName,
  eventId,
  participantNo,
  registrationId,
  location,
  startAt,
  registeredAt
}) {
  const safeName = String(fullName || '').trim() || 'Participant';
  const safeEventName = String(eventName || '').trim() || 'Event';
  const safeEventId = String(eventId || '').trim() || '-';
  const safeParticipantNo = String(participantNo || '').trim() || '-';
  const safeRegistrationId = String(registrationId || '').trim() || '-';
  const safeLocation = String(location || '').trim() || '-';
  const subject = `Konfirmasi registrasi: ${safeEventName}`;
  const text = [
    `Hi ${safeName},`,
    '',
    `Registrasi event berhasil: ${safeEventName}`,
    `Event ID: ${safeEventId}`,
    `Participant No: ${safeParticipantNo}`,
    `Registration ID: ${safeRegistrationId}`,
    `Lokasi: ${safeLocation}`,
    `Mulai: ${formatDateTime(startAt)}`,
    `Registered at: ${formatDateTime(registeredAt)}`,
    '',
    'Tunjukkan kode participant saat check-in.',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Registrasi event berhasil: <strong>${escapeHtml(safeEventName)}</strong></p>
    <p>
      <strong>Event ID:</strong> ${escapeHtml(safeEventId)}<br />
      <strong>Participant No:</strong> ${escapeHtml(safeParticipantNo)}<br />
      <strong>Registration ID:</strong> ${escapeHtml(safeRegistrationId)}<br />
      <strong>Lokasi:</strong> ${escapeHtml(safeLocation)}<br />
      <strong>Mulai:</strong> ${escapeHtml(formatDateTime(startAt))}<br />
      <strong>Registered at:</strong> ${escapeHtml(formatDateTime(registeredAt))}
    </p>
    <p>Tunjukkan kode participant saat check-in.</p>
    <p>Foremoz Team</p>
  `;
  return sendEmail({ to: email, subject, text, html });
}
