import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Lazily create a transport. If SMTP is not configured we fall back to a
// console "transport" so the auth flows are fully testable in development.
let transporter = null;

const getTransport = () => {
  if (transporter) return transporter;
  if (config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    });
  }
  return transporter;
};

// Email-client-safe template. Gmail/Outlook strip flexbox, external CSS and many
// modern properties, so we use table-based layout with inline styles only.
const baseTemplate = ({ title, intro, bodyHtml = '', actionUrl, actionLabel, note }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>DiskiTrack</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1976d2 0%,#1456a0 100%);padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">⚽ DiskiTrack</span>
              <div style="font-size:12px;color:#cfe1f7;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">Football Analytics Platform</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#0f172a;">${title}</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
              ${bodyHtml}
            </td>
          </tr>

          ${
            actionUrl
              ? `<!-- Button -->
          <tr>
            <td align="center" style="padding:8px 32px 28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#1976d2;">
                    <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${actionLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#94a3b8;">Or copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${actionUrl}" target="_blank" style="color:#1976d2;text-decoration:none;">${actionUrl}</a></p>
            </td>
          </tr>`
              : ''
          }

          ${
            note
              ? `<tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#64748b;">${note}</td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px 32px 32px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px 0;" />
              <p style="margin:0 0 4px 0;font-size:12px;line-height:1.5;color:#94a3b8;">If you didn't request this email, you can safely ignore it — no changes will be made to your account.</p>
              <p style="margin:8px 0 0 0;font-size:12px;color:#cbd5e1;">© ${new Date().getFullYear()} DiskiTrack. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const sendMail = async ({ to, subject, html, text }) => {
  const transport = getTransport();
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mailer] SMTP not configured — email NOT sent.\n  To: ${to}\n  Subject: ${subject}\n  ${text || ''}\n`
    );
    return { delivered: false };
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, html, text });
  return { delivered: true };
};

export const sendPasswordResetEmail = async (user, link) =>
  sendMail({
    to: user.email,
    subject: 'Reset your DiskiTrack password',
    text: `Hi ${user.first_name}, reset your DiskiTrack password using this link (expires in 1 hour): ${link}`,
    html: baseTemplate({
      title: `Hi ${user.first_name},`,
      intro:
        'We received a request to reset the password for your DiskiTrack account. Click the button below to choose a new one.',
      actionUrl: link,
      actionLabel: 'Reset password',
      note: '🔒 For your security, this link will expire in <strong>1 hour</strong> and can only be used once.',
    }),
  });

export const sendInviteEmail = async (user, link, inviter, clubName) =>
  sendMail({
    to: user.email,
    subject: `You've been invited to join ${clubName} on DiskiTrack`,
    text: `Hi ${user.first_name}, you've been invited to join ${clubName} on DiskiTrack. Set your password to activate your account (link expires in 7 days): ${link}`,
    html: baseTemplate({
      title: `Welcome, ${user.first_name}! 👋`,
      intro: `${inviter ? `${inviter} has invited you` : 'You have been invited'} to join <strong>${clubName}</strong> on DiskiTrack as a <strong>${user.role
        .replace('_', ' ')
        .toLowerCase()}</strong>.`,
      bodyHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Click below to set your password and activate your account.</p>',
      actionUrl: link,
      actionLabel: 'Activate account',
      note: '🔒 This invitation link expires in <strong>7 days</strong>. If it expires, ask your club admin to resend it.',
    }),
  });

// --- Club approval workflow emails -----------------------------------------

// Sent to the applicant immediately after they submit a club registration.
export const sendApplicationReceivedEmail = async (user, clubName) =>
  sendMail({
    to: user.email,
    subject: `We've received your DiskiTrack application for ${clubName}`,
    text: `Hi ${user.first_name}, thanks for registering ${clubName} on DiskiTrack. Our team is reviewing your application and proof of representation. You'll receive an email once it's approved.`,
    html: baseTemplate({
      title: `Thanks, ${user.first_name}!`,
      intro: `We've received your application to register <strong>${clubName}</strong> on DiskiTrack.`,
      bodyHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Our team is now reviewing your proof of representation. This usually takes 1–2 business days. We\'ll email you as soon as a decision is made — you don\'t need to do anything else for now.</p>',
      note: '⏳ Your account is <strong>pending approval</strong>. You\'ll be able to sign in once your club is approved.',
    }),
  });

// Sent to each system admin when a new application arrives.
export const sendNewApplicationAdminEmail = async (adminEmail, clubName, applicantName, reviewLink) =>
  sendMail({
    to: adminEmail,
    subject: `New club application: ${clubName}`,
    text: `${applicantName} has applied to register ${clubName} on DiskiTrack. Review it here: ${reviewLink}`,
    html: baseTemplate({
      title: 'New club application',
      intro: `<strong>${applicantName}</strong> has applied to register <strong>${clubName}</strong> on DiskiTrack.`,
      bodyHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Please review their proof of representation and approve or reject the application.</p>',
      actionUrl: reviewLink,
      actionLabel: 'Review application',
    }),
  });

// Sent to the applicant when their club is approved.
export const sendApplicationApprovedEmail = async (user, clubName, loginLink) =>
  sendMail({
    to: user.email,
    subject: `Your DiskiTrack club ${clubName} has been approved 🎉`,
    text: `Hi ${user.first_name}, great news — ${clubName} has been approved on DiskiTrack. You can now sign in: ${loginLink}`,
    html: baseTemplate({
      title: `You're approved, ${user.first_name}! 🎉`,
      intro: `Great news — <strong>${clubName}</strong> has been approved on DiskiTrack.`,
      bodyHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Your club admin account is now active. Sign in to set up your teams, players and matches.</p>',
      actionUrl: loginLink,
      actionLabel: 'Sign in to DiskiTrack',
    }),
  });

// Sent to the applicant when their club is rejected.
export const sendApplicationRejectedEmail = async (user, clubName, reason) =>
  sendMail({
    to: user.email,
    subject: `Update on your DiskiTrack application for ${clubName}`,
    text: `Hi ${user.first_name}, unfortunately your application to register ${clubName} could not be approved at this time. ${reason ? 'Reason: ' + reason : ''}`,
    html: baseTemplate({
      title: `Application update`,
      intro: `Thank you for your interest in DiskiTrack. Unfortunately, we couldn't approve your application to register <strong>${clubName}</strong> at this time.`,
      bodyHtml: reason
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:10px;margin:0 0 16px 0;"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.5;color:#b91c1c;"><strong>Reason:</strong> ${reason}</td></tr></table>`
        : '',
      note: 'If you believe this was a mistake or can provide additional proof, please reply to this email or register again with the correct documentation.',
    }),
  });
