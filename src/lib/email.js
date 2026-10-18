import fs from 'fs';
import path from 'path';
import { getBaseUrl } from './url';

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
  const nextAuthUrl = getBaseUrl();
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
  const nextAuthUrl = getBaseUrl();

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

  const nextAuthUrl = getBaseUrl();
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

export async function sendOrderConfirmationEmail(order) {
  const {
    orderReference,
    email,
    productName,
    price,
    pickupLocationName,
    pickupLocationAddress,
    pickupLocationOpeningHours,
  } = order;

  if (!email) {
    throw new Error('Recipient email is required.');
  }

  const formattedPrice = `₦${Number(price || 0).toLocaleString()}`;
  const safeLocationName = pickupLocationName || 'Sleek Pickup Hub';
  const safeLocationAddress = pickupLocationAddress || 'Selected Sleek Partner Store';
  const safeOpeningHours = pickupLocationOpeningHours || 'Mon - Sat: 9:00 AM - 6:00 PM';
  const directionsQuery = encodeURIComponent(`${safeLocationAddress} ${safeLocationName}`.trim());
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${directionsQuery}`;

  const logMessage = `
========================================
[EMAIL LOG] Order Confirmation #${orderReference} for ${email}
Product: ${productName}
Price: ${formattedPrice}
Pickup Location: ${safeLocationName}
Address: ${safeLocationAddress}
Opening Hours: ${safeOpeningHours}
Directions: ${directionsUrl}
Generated at: ${new Date().toISOString()}
========================================
`;
  console.log(logMessage);
  safeAppendEmailLog(logMessage);

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SLEEK Order Confirmation #${escapeHtml(orderReference)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0f; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2e; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          
          <!-- Header Banner: Dark Chrome & Copper -->
          <tr>
            <td style="background: linear-gradient(135deg, #141417 0%, #1e1e24 100%); padding: 36px 32px 28px; text-align: center; border-bottom: 2px solid #ba9c87;">
              <div style="font-size: 11px; letter-spacing: 6px; color: #ba9c87; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                S L E E K
              </div>
              <h1 style="margin: 0; color: #f5f5f7; font-size: 22px; font-weight: 400; letter-spacing: 1px;">
                Order Confirmation
              </h1>
              <div style="margin-top: 10px; display: inline-block; background-color: rgba(186, 156, 135, 0.15); border: 1px solid #ba9c87; border-radius: 4px; padding: 4px 12px;">
                <span style="font-family: monospace; font-size: 13px; color: #ba9c87; font-weight: 700; letter-spacing: 2px;">
                  #${escapeHtml(orderReference)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #444444;">
                Thank you for your order. We’ve received your payment and your copy is confirmed. Below are your order and pickup details.
              </p>

              <!-- Order Summary Card (Chrome & Copper Accent) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9f9fb; border: 1px solid #e5e5ea; border-left: 4px solid #ba9c87; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; letter-spacing: 2px; color: #8e8e93; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
                      Order Summary
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Product:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111111; font-weight: 600; text-align: right;">${escapeHtml(productName)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Price Paid:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111111; font-weight: 700; text-align: right;">${escapeHtml(formattedPrice)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Order Reference:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-family: monospace; color: #ba9c87; font-weight: 700; text-align: right;">${escapeHtml(orderReference)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #666666;">Customer Email:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #333333; text-align: right;">${escapeHtml(email)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pickup Location Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fdfbf9; border: 1px solid #e8dfd8; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; letter-spacing: 2px; color: #ba9c87; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                      Selected Pickup Location
                    </div>
                    <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #1c1c1e; font-weight: 600;">
                      ${escapeHtml(safeLocationName)}
                    </h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #555555; line-height: 1.5;">
                      ${escapeHtml(safeLocationAddress)}
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #777777;">
                      <strong style="color: #333333;">Hours:</strong> ${escapeHtml(safeOpeningHours)}
                    </p>
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ba9c87; border-radius: 4px; text-align: center;">
                          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.5px;">
                            Get Directions &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #777777;">
                Please present this email or order reference (<strong>#${escapeHtml(orderReference)}</strong>) when picking up your order.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; background-color: #f7f7f9; border-top: 1px solid #e5e5ea; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #8e8e93; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                SLEEK MAGAZINE
              </p>
              <p style="margin: 0; font-size: 11px; color: #aeaeb2;">
                This email was sent regarding your recent purchase from Sleek.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `SLEEK - ORDER CONFIRMATION
Order Reference: #${orderReference}

Hello,

Thank you for your order. We've received your payment and your copy is confirmed.

ORDER SUMMARY
Product: ${productName}
Price Paid: ${formattedPrice}
Order Reference: #${orderReference}
Customer Email: ${email}

PICKUP LOCATION
${safeLocationName}
${safeLocationAddress}
Opening Hours: ${safeOpeningHours}
Get Directions: ${directionsUrl}

Please present your order reference (#${orderReference}) when picking up your order.

Sleek Magazine
`;

  const host = getEnvVar('BREVO_SMTP_HOST', 'BREVO_HOST') || 'smtp-relay.brevo.com';
  const port = parseInt(getEnvVar('BREVO_SMTP_PORT', 'BREVO_PORT') || '587', 10);
  const smtpUser = getEnvVar('BREVO_SMTP_USER', 'BREVO_USER', 'BREVO_LOGIN');
  const smtpPass = getEnvVar('BREVO_SMTP_PASS', 'BREVO_SMTP_KEY', 'BREVO_SMTP_PASSWORD', 'BREVO_PASSWORD');
  const brevoApiKey = getEnvVar('BREVO_API_KEY', 'BREVO_KEY', 'SENDINBLUE_API_KEY');
  const senderEmail = getEnvVar('BREVO_FROM_EMAIL', 'BREVO_EMAIL_FROM') || smtpUser || 'thesleekmagazine@gmail.com';

  const brevoCredentialIssue = getBrevoCredentialIssue({ smtpUser, smtpPass, brevoApiKey });
  if (brevoCredentialIssue) {
    console.warn('[EMAIL] Brevo credentials issue for order confirmation:', brevoCredentialIssue);
  }

  // Attempt 1: Brevo REST API
  if (brevoApiKey && !brevoApiKey.includes('your-brevo')) {
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
          subject: `Your SLEEK Order Confirmation #${orderReference}`,
          htmlContent: emailHtml,
          textContent,
        }),
      });

      const brevoData = await brevoResponse.json();
      if (brevoResponse.ok) {
        console.log('[EMAIL] Order confirmation successfully sent via Brevo API. Message ID:', brevoData.messageId);
        return { ok: true, messageId: brevoData.messageId };
      }

      console.warn('[EMAIL] Brevo REST API returned non-OK response:', brevoData);
      throw new Error(brevoData.message || 'Brevo API error');
    } catch (apiErr) {
      console.warn('[EMAIL] Brevo REST API failed for order confirmation, trying SMTP transport:', apiErr.message);
    }
  }

  // Attempt 2: Nodemailer SMTP
  if (smtpUser && smtpPass && !smtpPass.includes('your-brevo')) {
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
        subject: `Your SLEEK Order Confirmation #${orderReference}`,
        text: textContent,
        html: emailHtml,
      });

      console.log('[EMAIL] Order confirmation successfully sent via SMTP. Message ID:', info.messageId);
      return { ok: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error('[EMAIL ERROR] Failed to send order confirmation via SMTP:', smtpErr.message || smtpErr);
      throw new Error(smtpErr.message || 'SMTP delivery failed');
    }
  }

  // If no credentials configured (dev fallback)
  console.log('[EMAIL] Brevo credentials not configured. Order confirmation logged to sent_emails.txt.');
  return { ok: true, messageId: 'logged-to-file' };
}

export async function sendEventTicketEmail(ticket) {
  const {
    ticketReference,
    email,
    eventTitle,
    eventDate,
    eventLocation,
    eventAddress,
    ticketPrice,
    quantity = 1,
    totalPrice,
  } = ticket;

  if (!email) {
    throw new Error('Recipient email is required.');
  }

  const formattedPrice = `₦${Number(totalPrice || ticketPrice || 0).toLocaleString()}`;
  const formattedTicketPrice = `₦${Number(ticketPrice || 0).toLocaleString()}`;
  const safeEventTitle = eventTitle || 'SLEEK Event';
  const safeLocation = eventLocation || 'Exclusive Venue';
  const safeAddress = eventAddress || 'Venue Location';
  
  let formattedDateString = 'Upcoming Event';
  try {
    const d = new Date(eventDate);
    formattedDateString = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    formattedDateString = String(eventDate || 'Upcoming');
  }

  const directionsQuery = encodeURIComponent(`${safeAddress} ${safeLocation}`.trim());
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${directionsQuery}`;

  const logMessage = `
========================================
[EMAIL LOG] Event Ticket & Receipt #${ticketReference} for ${email}
Event: ${safeEventTitle}
Date & Time: ${formattedDateString}
Venue: ${safeLocation}
Address: ${safeAddress}
Quantity: ${quantity}
Total Paid: ${formattedPrice}
Directions: ${directionsUrl}
Generated at: ${new Date().toISOString()}
========================================
`;
  console.log(logMessage);
  safeAppendEmailLog(logMessage);

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SLEEK Event Ticket & Receipt #${escapeHtml(ticketReference)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0f; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2e; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          
          <!-- Header Banner: Dark Chrome & Copper -->
          <tr>
            <td style="background: linear-gradient(135deg, #141417 0%, #1e1e24 100%); padding: 36px 32px 28px; text-align: center; border-bottom: 2px solid #ba9c87;">
              <div style="font-size: 11px; letter-spacing: 6px; color: #ba9c87; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                S L E E K &bull; EXPERIENCES
              </div>
              <h1 style="margin: 0; color: #f5f5f7; font-size: 22px; font-weight: 400; letter-spacing: 1px;">
                Event Ticket &amp; Receipt
              </h1>
              <div style="margin-top: 10px; display: inline-block; background-color: rgba(186, 156, 135, 0.15); border: 1px solid #ba9c87; border-radius: 4px; padding: 4px 12px;">
                <span style="font-family: monospace; font-size: 13px; color: #ba9c87; font-weight: 700; letter-spacing: 2px;">
                  #${escapeHtml(ticketReference)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #444444;">
                Your ticket for <strong>${escapeHtml(safeEventTitle)}</strong> is confirmed. We’ve received your payment and your admission pass is ready below.
              </p>

              <!-- Ticket Admission Card (Chrome & Copper Accent) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fdfbf9; border: 1px solid #e8dfd8; border-left: 4px solid #ba9c87; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; letter-spacing: 2px; color: #ba9c87; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
                      Ticket &amp; Admission Pass
                    </div>
                    <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #1c1c1e; font-weight: 600;">
                      ${escapeHtml(safeEventTitle)}
                    </h2>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666; width: 35%;">Date &amp; Time:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111111; font-weight: 600; text-align: right;">${escapeHtml(formattedDateString)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666;">Venue:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #111111; font-weight: 600; text-align: right;">${escapeHtml(safeLocation)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666;">Address:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #444444; text-align: right;">${escapeHtml(safeAddress)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666;">Tickets Booked:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #ba9c87; font-weight: 700; text-align: right;">${quantity} Ticket${quantity > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666;">Total Paid:</td>
                        <td style="padding: 6px 0; font-size: 15px; color: #111111; font-weight: 700; text-align: right;">${escapeHtml(formattedPrice)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #666666;">Ticket Pass:</td>
                        <td style="padding: 6px 0; font-size: 13px; font-family: monospace; color: #ba9c87; font-weight: 700; text-align: right;">#${escapeHtml(ticketReference)}</td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #e8dfd8;">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="background-color: #ba9c87; border-radius: 4px; text-align: center;">
                            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; font-size: 12px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.5px;">
                              Get Venue Directions &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Admission Instructions -->
              <div style="background-color: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555555;">
                  &bull; <strong>Entry Instructions:</strong> Please present this email or show your Ticket Reference (<strong>#${escapeHtml(ticketReference)}</strong>) at the venue entrance for admission check-in.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #777777;">
                See you there! For inquiries regarding this event, reply directly or contact SLEEK team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; background-color: #f7f7f9; border-top: 1px solid #e5e5ea; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #8e8e93; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                SLEEK MAGAZINE &bull; EXPERIENCES
              </p>
              <p style="margin: 0; font-size: 11px; color: #aeaeb2;">
                This email was sent to ${escapeHtml(email)} regarding your recent event ticket purchase from Sleek.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `SLEEK - EVENT TICKET & RECEIPT
Ticket Reference: #${ticketReference}

Hello,

Thank you for your purchase. Your ticket for ${safeEventTitle} is confirmed.

EVENT DETAILS
Event: ${safeEventTitle}
Date & Time: ${formattedDateString}
Venue: ${safeLocation}
Address: ${safeAddress}
Tickets: ${quantity} Ticket${quantity > 1 ? 's' : ''}
Total Paid: ${formattedPrice}
Ticket Reference: #${ticketReference}
Customer Email: ${email}

DIRECTIONS
Get Directions: ${directionsUrl}

ADMISSION INSTRUCTIONS
Please present this email or Ticket Reference (#${ticketReference}) at the venue entrance for admission check-in.

Sleek Magazine Experiences
`;

  const host = getEnvVar('BREVO_SMTP_HOST', 'BREVO_HOST') || 'smtp-relay.brevo.com';
  const port = parseInt(getEnvVar('BREVO_SMTP_PORT', 'BREVO_PORT') || '587', 10);
  const smtpUser = getEnvVar('BREVO_SMTP_USER', 'BREVO_USER', 'BREVO_LOGIN');
  const smtpPass = getEnvVar('BREVO_SMTP_PASS', 'BREVO_SMTP_KEY', 'BREVO_SMTP_PASSWORD', 'BREVO_PASSWORD');
  const brevoApiKey = getEnvVar('BREVO_API_KEY', 'BREVO_KEY', 'SENDINBLUE_API_KEY');
  const senderEmail = getEnvVar('BREVO_FROM_EMAIL', 'BREVO_EMAIL_FROM') || smtpUser || 'thesleekmagazine@gmail.com';

  const brevoCredentialIssue = getBrevoCredentialIssue({ smtpUser, smtpPass, brevoApiKey });
  if (brevoCredentialIssue) {
    console.warn('[EMAIL] Brevo credentials issue for event ticket:', brevoCredentialIssue);
  }

  // Attempt 1: Brevo REST API
  if (brevoApiKey && !brevoApiKey.includes('your-brevo')) {
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
          subject: `Your SLEEK Event Ticket & Receipt #${ticketReference} — ${safeEventTitle}`,
          htmlContent: emailHtml,
          textContent,
        }),
      });

      const brevoData = await brevoResponse.json();
      if (brevoResponse.ok) {
        console.log('[EMAIL] Event ticket confirmation successfully sent via Brevo API. Message ID:', brevoData.messageId);
        return { ok: true, messageId: brevoData.messageId };
      }

      console.warn('[EMAIL] Brevo REST API returned non-OK response for ticket:', brevoData);
      throw new Error(brevoData.message || 'Brevo API error');
    } catch (apiErr) {
      console.warn('[EMAIL] Brevo REST API failed for event ticket, trying SMTP transport:', apiErr.message);
    }
  }

  // Attempt 2: Nodemailer SMTP
  if (smtpUser && smtpPass && !smtpPass.includes('your-brevo')) {
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
        subject: `Your SLEEK Event Ticket & Receipt #${ticketReference} — ${safeEventTitle}`,
        text: textContent,
        html: emailHtml,
      });

      console.log('[EMAIL] Event ticket successfully sent via SMTP. Message ID:', info.messageId);
      return { ok: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error('[EMAIL ERROR] Failed to send event ticket via SMTP:', smtpErr.message || smtpErr);
      throw new Error(smtpErr.message || 'SMTP delivery failed');
    }
  }

  // Dev fallback: logged to file
  console.log('[EMAIL] Brevo credentials not configured. Event ticket logged to sent_emails.txt.');
  return { ok: true, messageId: 'logged-to-file' };
}
