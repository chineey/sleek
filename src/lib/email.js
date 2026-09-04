import fs from 'fs';
import path from 'path';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  
  // Write to workspace scratch/sent_emails.txt for easy access
  try {
    const logDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(path.join(logDir, 'sent_emails.txt'), logMessage);
  } catch (err) {
    console.error('Failed to log email to file:', err);
  }

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.BREVO_SMTP_PORT || '587', 10);
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;

  if (!user || !pass || pass.includes('your-brevo') || user.includes('your-brevo')) {
    console.log('[EMAIL] Brevo credentials not set in .env. Logged to console/scratch.');
    return true;
  }

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #ba9c87; text-align: center;">S L E E K</h2>
      <p>Hello,</p>
      <p>You requested a magic link to access SLEEK Magazine. Click the button below to sign in:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLink}" style="background-color: #ba9c87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; display: inline-block;">Access Magazine</a>
      </div>
      <p style="font-size: 12px; color: #666;">Or copy and paste this link in your browser:</p>
      <p style="font-size: 12px; color: #ba9c87; word-break: break-all;">${magicLink}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">This link will expire in 15 minutes.</p>
    </div>
  `;

  const senderEmail = process.env.BREVO_FROM_EMAIL || user;

  // 1. Try Brevo Transactional Email REST API first (fast, native fetch)
  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': pass,
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
    } else {
      console.warn('[EMAIL] Brevo REST API returned an issue:', brevoData);
    }
  } catch (apiErr) {
    console.warn('[EMAIL] Brevo REST API failed, falling back to SMTP transport:', apiErr.message);
  }

  // 2. Fallback to Nodemailer SMTP
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
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

  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey || brevoApiKey.includes('your-brevo')) {
    console.log('[EMAIL] Brevo API key not set in .env. Skipping email notification.');
    return true;
  }

  const senderEmail = process.env.BREVO_FROM_EMAIL || user;
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
        to: emails.map((email) => ({ email })),
        subject: `New Story: ${articleTitle}`,
        htmlContent: emailHtml,
        textContent: `New story from SLEEK: ${articleTitle}\n\n${teaser}\n\nRead it here: ${articleUrl}`,
      }),
    });

    const brevoData = await brevoResponse.json();
    if (!brevoResponse.ok) {
      console.warn('[EMAIL] Brevo new article notification failed:', brevoData);
      return false;
    }

    console.log('[EMAIL] New article notification successfully sent via Brevo API. Message ID:', brevoData.messageId);
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send new article notification via Brevo:', error.message || error);
    return false;
  }
}
