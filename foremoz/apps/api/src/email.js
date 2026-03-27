import nodemailer from 'nodemailer';
import { config } from './config.js';
import { formatAppDateTime as formatDateTime } from './time.js';

let transporterPromise = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export async function sendTenantActivationEmail({ email, fullName, role, tenantId, activationUrl, activationCode, expiresAt }) {
  const safeName = String(fullName || '').trim() || 'Owner';
  const safeRole = String(role || 'owner').trim() || 'owner';
  const safeTenantId = String(tenantId || '').trim() || '-';
  const safeActivationUrl = String(activationUrl || '').trim();
  const safeActivationCode = String(activationCode || '').trim() || '-';
  const subject = `Aktivasi akun Foremoz: ${safeTenantId}`;
  const text = [
    `Hi ${safeName},`,
    '',
    'Akun Foremoz kamu sudah dibuat, tapi masih menunggu aktivasi email.',
    `Tenant ID: ${safeTenantId}`,
    `Role: ${safeRole}`,
    '',
    `Kode verifikasi: ${safeActivationCode}`,
    `Berlaku sampai: ${formatDateTime(expiresAt)}`,
    '',
    'Masukkan email dan kode verifikasi di halaman verify password, atau klik link berikut:',
    safeActivationUrl || '-',
    '',
    'Setelah aktivasi, kamu bisa login dan membuat event/class.',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Akun Foremoz kamu sudah dibuat, tapi masih menunggu aktivasi email.</p>
    <p>
      <strong>Tenant ID:</strong> ${escapeHtml(safeTenantId)}<br />
      <strong>Role:</strong> ${escapeHtml(safeRole)}<br />
      <strong>Kode verifikasi:</strong> ${escapeHtml(safeActivationCode)}<br />
      <strong>Berlaku sampai:</strong> ${escapeHtml(formatDateTime(expiresAt))}
    </p>
    <p>
      Masukkan email dan kode verifikasi di halaman verify password, atau klik link berikut:
    </p>
    <p>
      <a href="${escapeHtml(safeActivationUrl)}">Aktivasi akun sekarang</a>
    </p>
    <p>Setelah aktivasi, kamu bisa login dan membuat event/class.</p>
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

export async function sendPassportWelcomeEmail({
  email,
  fullName,
  eventName
}) {
  const safeName = String(fullName || '').trim() || 'Member';
  const safeEventName = String(eventName || '').trim() || 'event Anda';
  const emailParam = encodeURIComponent(String(email || '').trim().toLowerCase());
  const signupUrl = `${config.appOrigin}/passport/signup${emailParam ? `?email=${emailParam}` : ''}`;
  const signinUrl = `${config.appOrigin}/passport/signin${emailParam ? `?email=${emailParam}` : ''}`;
  const subject = 'Selamat datang di Foremoz Passport';
  const text = [
    `Hi ${safeName},`,
    '',
    `Terima kasih, Anda sudah terdaftar di ${safeEventName}.`,
    '',
    'Agar riwayat event, class, dan aktivitas Anda tersimpan rapi di Foremoz, aktifkan Passport Anda sekarang.',
    '',
    'Buat password Passport:',
    signupUrl,
    '',
    'Kalau sudah punya password, masuk di sini:',
    signinUrl,
    '',
    'Dengan Passport Foremoz Anda bisa:',
    '- melihat riwayat event dan class',
    '- menyimpan profil dan aktivitas',
    '- memakai email yang sama untuk registrasi berikutnya',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Terima kasih, Anda sudah terdaftar di <strong>${escapeHtml(safeEventName)}</strong>.</p>
    <p>Agar riwayat event, class, dan aktivitas Anda tersimpan rapi di Foremoz, aktifkan Passport Anda sekarang.</p>
    <p>
      <a href="${escapeHtml(signupUrl)}">Buat password Passport</a>
    </p>
    <p>
      Sudah punya password?
      <a href="${escapeHtml(signinUrl)}">Masuk ke Passport</a>
    </p>
    <p>Dengan Passport Foremoz Anda bisa:</p>
    <ul>
      <li>melihat riwayat event dan class</li>
      <li>menyimpan profil dan aktivitas</li>
      <li>memakai email yang sama untuk registrasi berikutnya</li>
    </ul>
    <p>Foremoz Team</p>
  `;
  return sendEmail({ to: email, subject, text, html });
}

export async function sendPasswordResetEmail({
  email,
  fullName,
  resetCode,
  tenantId,
  audience = 'member',
  expiresAt
}) {
  const safeName = String(fullName || '').trim() || 'User';
  const safeCode = String(resetCode || '').trim() || '-';
  const safeTenantId = String(tenantId || '').trim() || '-';
  const safeAudience = String(audience || 'member').trim().toLowerCase();
  const scopeLabel = safeAudience === 'host' ? 'Host/Tenant' : 'Member/Participant';
  const subject = `Kode reset password Foremoz (${scopeLabel})`;
  const text = [
    `Hi ${safeName},`,
    '',
    `Kami menerima permintaan reset password untuk akun ${scopeLabel}.`,
    `Tenant ID: ${safeTenantId}`,
    `Kode verifikasi: ${safeCode}`,
    `Berlaku sampai: ${formatDateTime(expiresAt)}`,
    '',
    'Masukkan kode ini di halaman reset password Foremoz.',
    '',
    'Jika kamu tidak meminta reset password, abaikan email ini.',
    '',
    'Foremoz Team'
  ].join('\n');
  const html = `
    <p>Hi ${escapeHtml(safeName)},</p>
    <p>Kami menerima permintaan reset password untuk akun <strong>${escapeHtml(scopeLabel)}</strong>.</p>
    <p>
      <strong>Tenant ID:</strong> ${escapeHtml(safeTenantId)}<br />
      <strong>Kode verifikasi:</strong> ${escapeHtml(safeCode)}<br />
      <strong>Berlaku sampai:</strong> ${escapeHtml(formatDateTime(expiresAt))}
    </p>
    <p>Masukkan kode ini di halaman reset password Foremoz.</p>
    <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
    <p>Foremoz Team</p>
  `;
  return sendEmail({ to: email, subject, text, html });
}
