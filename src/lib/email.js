import fs from 'fs';
import path from 'path';

function getEnvVar(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeAppendEmailLog(logMessage) {
  const candidates = [
    path.join(process.cwd(), 'scratch', 'sent_emails.txt'),
    path.join(process.cwd(), 'sent_emails.txt'),
    '/tmp/sent_emails.txt',
  ];

  for (const candidate of candidates) {
    try {
      const dir = path.dirname(candidate);
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(candidate, logMessage);
      return;
    } catch (err) {
      // Ignore and try the next available writable location.
    }
  }

  console.error('Failed to log email to file:', new Error('No writable log location available'));
}

function getBrevoCredentialIssue({ smtpUser, smtpPass, brevoApiKey }) {
  if (!smtpUser) return 'BREVO_SMTP_USER is missing.';
  if (!smtpPass) return 'BREVO_SMTP_PASS is missing.';
  if (!brevoApiKey) return 'BREVO_API_KEY is missing.';
  if (smtpUser.includes('your-brevo')) return 'BREVO_SMTP_USER still contains a placeholder value.';
  if (smtpPass.includes('your-brevo') || smtpPass.includes('your-brevo-smtp-key')) return 'BREVO_SMTP_PASS still contains a placeholder value; use the SMTP key from Brevo (starts with xsmtpsib-).';
  if (brevoApiKey.includes('your-brevo') || brevoApiKey.includes('your_brevo_api_key_here')) return 'BREVO_API_KEY still contains a placeholder value; use the API key from Brevo (starts with xkeysib-).';
  if (smtpPass.startsWith('xkeysib-')) return 'BREVO_SMTP_PASS looks like a Brevo API key, not an SMTP key. Use the SMTP key (starts with xsmtpsib-).';
  if (brevoApiKey.startsWith('xsmtpsib-')) return 'BREVO_API_KEY looks like a Brevo SMTP key, not an API key. Use the API key (starts with xkeysib-).';
  return null;
}

export async function sendMagicLinkEmail(email, token) {
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const magicLink = `${nextAuthUrl}/api/magic-link/verify?token=${token}`;

  const logMessage = `
========================================
[EMAIL LOG] Magic Link for ${email}
URL: ${magicLink}
Generated at: ${new Date().toISOString()}
========================================
`;
  console.log(logMessage);
  safeAppendEmailLog(logMessage);

  const host = getEnvVar('BREVO_SMTP_HOST', 'BREVO_HOST') || 'smtp-relay.brevo.com';
  const port = parseInt(getEnvVar('BREVO_SMTP_PORT', 'BREVO_PORT') || '587', 10);
  const smtpUser = getEnvVar('BREVO_SMTP_USER', 'BREVO_USER', 'BREVO_LOGIN');
  const smtpPass = getEnvVar('BREVO_SMTP_PASS', 'BREVO_SMTP_KEY', 'BREVO_SMTP_PASSWORD', 'BREVO_PASSWORD');
  const brevoApiKey = getEnvVar('BREVO_API_KEY', 'BREVO_KEY', 'SENDINBLUE_API_KEY');
  const brevoCredentialIssue = getBrevoCredentialIssue({ smtpUser, smtpPass, brevoApiKey });

  if (brevoCredentialIssue) {
    console.warn('[EMAIL] Brevo credentials are misconfigured:', brevoCredentialIssue);
    console.log('[EMAIL] Brevo SMTP/API credentials are not configured or invalid. Logged to console and fallback log file.');
    return true;
  }

  if (!smtpUser || !smtpPass || !brevoApiKey || smtpPass.includes('your-brevo') || smtpUser.includes('your-brevo') || brevoApiKey.includes('your-brevo')) {
    console.log('[EMAIL] Brevo SMTP/API credentials are not configured. Logged to console and fallback log file.');
    return true;
  }

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #ba9c87; text-align: center;">S L E E K</h2>
      <p>Hello,</p>
      <p>You requested to access SLEEK Magazine. Click the button below to sign in:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLink}" style="background-color: #ba9c87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">Access Magazine</a>
      </div>
      <p style="font-size: 12px; color: #666;">Or copy and paste this link in your browser:</p>
      <p style="font-size: 12px; color: #ba9c87; word-break: break-all;">${magicLink}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">This link will expire in 15 minutes.</p>
    </div>
  `;

  const senderEmail = getEnvVar('BREVO_FROM_EMAIL', 'BREVO_EMAIL_FROM') || smtpUser;

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'SLEEK Magazine',
          email: senderEmail,
        },
        to: [{ email }],
        subject: 'Your Magic Link for SLEEK Magazine',
        htmlContent: emailHtml,
        textContent: `Hello,\n\nClick the link below to access SLEEK Magazine:\n\n${magicLink}\n\nThis link will expire in 15 minutes.`,
      }),
    });

    const brevoData = await brevoResponse.json();
    if (brevoResponse.ok) {
      console.log('[EMAIL] Magic link successfully sent via Brevo API. Message ID:', brevoData.messageId);
      return true;
    }

    console.warn('[EMAIL] Brevo REST API returned an issue:', brevoData);
  } catch (apiErr) {
    console.warn('[EMAIL] Brevo REST API failed, falling back to SMTP transport:', apiErr.message);
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"SLEEK Magazine" <${senderEmail}>`,
      to: email,
      subject: 'Your Magic Link for SLEEK Magazine',
      text: `Hello,\n\nClick the link below to access SLEEK Magazine:\n\n${magicLink}\n\nThis link will expire in 15 minutes.`,
      html: emailHtml,
    });

    console.log('[EMAIL] Magic link successfully sent via Brevo SMTP transport:', info.messageId);
    return true;
  } catch (smtpErr) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', smtpErr.message || smtpErr);
    return false;
  }
}

export async function sendSubscriptionConfirmationEmail(email) {
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const logMessage = `
========================================
[EMAIL LOG] Subscription confirmation for ${email}
Generated at: ${new Date().toISOString()}
========================================
`;
  console.log(logMessage);
  safeAppendEmailLog(logMessage);

  const host = getEnvVar('BREVO_SMTP_HOST', 'BREVO_HOST') || 'smtp-relay.brevo.com';
  const port = parseInt(getEnvVar('BREVO_SMTP_PORT', 'BREVO_PORT') || '587', 10);
  const smtpUser = getEnvVar('BREVO_SMTP_USER', 'BREVO_USER', 'BREVO_LOGIN');
  const smtpPass = getEnvVar('BREVO_SMTP_PASS', 'BREVO_SMTP_KEY', 'BREVO_SMTP_PASSWORD', 'BREVO_PASSWORD');
  const brevoApiKey = getEnvVar('BREVO_API_KEY', 'BREVO_KEY', 'SENDINBLUE_API_KEY');
  const brevoCredentialIssue = getBrevoCredentialIssue({ smtpUser, smtpPass, brevoApiKey });

  if (brevoCredentialIssue) {
    console.warn('[EMAIL] Brevo credentials are misconfigured:', brevoCredentialIssue);
    console.log('[EMAIL] Brevo SMTP/API credentials are not configured or invalid. Logged to console and fallback log file.');
    return true;
  }

  if (!smtpUser || !smtpPass || !brevoApiKey || smtpPass.includes('your-brevo') || smtpUser.includes('your-brevo') || brevoApiKey.includes('your-brevo')) {
    console.log('[EMAIL] Brevo SMTP/API credentials are not configured. Logged to console and fallback log file.');
    return true;
  }

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #ba9c87; text-align: center;">S L E E K</h2>
      <p>Hello,</p>
      <p style="font-size: 16px; color: #333;">Thank you for subscribing to SLEEK Magazine. Enjoy the articles.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${nextAuthUrl}/#editorial" style="background-color: #ba9c87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">Start Reading</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">Thank you for joining SLEEK Magazine.</p>
    </div>
  `;

  const senderEmail = getEnvVar('BREVO_FROM_EMAIL', 'BREVO_EMAIL_FROM') || smtpUser;

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'SLEEK Magazine',
          email: senderEmail,
        },
        to: [{ email }],
        subject: 'Thank you for subscribing to SLEEK Magazine. Enjoy the articles.',
        htmlContent: emailHtml,
        textContent: 'Thank you for subscribing to SLEEK Magazine. Enjoy the articles.',
      }),
    });

    const brevoData = await brevoResponse.json();
    if (brevoResponse.ok) {
      console.log('[EMAIL] Subscription confirmation successfully sent via Brevo API. Message ID:', brevoData.messageId);
      return true;
    }

    console.warn('[EMAIL] Brevo REST API returned an issue:', brevoData);
  } catch (apiErr) {
    console.warn('[EMAIL] Brevo REST API failed, falling back to SMTP transport:', apiErr.message);
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"SLEEK Magazine" <${senderEmail}>`,
      to: email,
      subject: 'Thank you for subscribing to SLEEK Magazine. Enjoy the articles.',
      text: 'Thank you for subscribing to SLEEK Magazine. Enjoy the articles.',
      html: emailHtml,
    });

    console.log('[EMAIL] Subscription confirmation successfully sent via Brevo SMTP transport:', info.messageId);
    return true;
  } catch (smtpErr) {
    console.error('[EMAIL ERROR] Failed to send subscription confirmation via SMTP:', smtpErr.message || smtpErr);
    return false;
  }
}

export async function sendNewArticleNotificationEmail(article, recipientEmails = []) {
  const emails = Array.from(new Set((recipientEmails || []).filter(Boolean)));

  if (!emails.length) {
    console.log('[EMAIL] No active subscribers to notify about the new article.');
    return true;
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const articleUrl = `${nextAuthUrl}/#editorial`;
  const articleTitle = article?.title || 'New SLEEK story';
  const articleCategory = article?.category || 'Latest';
  const articleAuthor = article?.author || 'SLEEK Editorial';
  const articleDate = article?.date || new Date().toISOString().slice(0, 10);
  const rawContent = article?.content || '';
  const previewText = rawContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const teaser = previewText ? previewText.slice(0, 180) : 'A new story has just been published on SLEEK.';

  const brevoApiKey = getEnvVar('BREVO_API_KEY', 'BREVO_KEY', 'SENDINBLUE_API_KEY');

  if (!brevoApiKey || brevoApiKey.includes('your-brevo')) {
    console.log('[EMAIL] Brevo API key not set in .env. Skipping email notification.');
    return true;
  }

  const senderEmail = getEnvVar('BREVO_FROM_EMAIL', 'BREVO_EMAIL_FROM') || getEnvVar('BREVO_SMTP_USER', 'BREVO_USER', 'BREVO_LOGIN') || 'no-reply@sleek.mag';
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background: #fff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 12px; letter-spacing: 4px; color: #ba9c87; font-weight: 700;">S L E E K</div>
      </div>
      <h2 style="margin: 0 0 12px; color: #111; font-size: 30px; line-height: 1.2;">${escapeHtml(articleTitle)}</h2>
      <p style="margin: 0 0 18px; color: #666; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(articleCategory)} • ${escapeHtml(articleAuthor)} • ${escapeHtml(articleDate)}</p>
      <p style="margin: 0 0 24px; color: #333; font-size: 16px; line-height: 1.6;">${escapeHtml(teaser)}...</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${articleUrl}" style="display: inline-block; background: #ba9c87; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 600;">Read the full story</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #777; text-align: center;">You are receiving this because you are an active SLEEK subscriber.</p>
    </div>
  `;

  // Send individually to each subscriber so recipients cannot see other addresses
  async function sendToRecipient(targetEmail) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'SLEEK Magazine', email: senderEmail },
          to: [{ email: targetEmail }],
          subject: `New Story: ${articleTitle}`,
          htmlContent: emailHtml,
          textContent: `New story from SLEEK: ${articleTitle}\n\n${teaser}\n\nRead it here: ${articleUrl}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn(`[EMAIL] Notification to ${targetEmail} failed:`, data);
        return { ok: false, to: targetEmail, data };
      }

      return { ok: true, to: targetEmail, messageId: data.messageId };
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send to ${targetEmail}:`, err.message || err);
      return { ok: false, to: targetEmail, error: err.message || err };
    }
  }

  const sendResults = await Promise.allSettled(emails.map((e) => sendToRecipient(e)));
  const failures = sendResults.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));

  if (failures.length) {
    console.warn(`[EMAIL] ${failures.length} of ${emails.length} notifications failed.`);
    return false;
  }

  console.log('[EMAIL] New article notifications successfully sent to all subscribers via Brevo API.');
  return true;
}