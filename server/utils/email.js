const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // If SMTP env vars are set, use them
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback: create Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('📧 Ethereal test email account:', testAccount.user);
  return transporter;
}

async function sendVerificationEmail(email, token, baseUrl) {
  const transport = await getTransporter();
  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"BG Mesob" <noreply@bgmesob.et>',
    to: email,
    subject: 'Verify Your Email — BG Mesob Internship',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:system-ui,sans-serif;padding:2rem;">
        <div style="text-align:center;margin-bottom:1.5rem;">
          <h1 style="font-size:1.5rem;color:#1a1a2e;margin:0;"> BG Mesob</h1>
          <p style="color:#7a7a8e;font-size:0.85rem;">Internship Management Platform</p>
        </div>
        <div style="background:#faf8f5;border-radius:12px;padding:2rem;border:1px solid #e8e4de;">
          <h2 style="font-size:1.1rem;color:#1a1a2e;margin:0 0 1rem;">Verify Your Email</h2>
          <p style="color:#3d3d56;font-size:0.9rem;line-height:1.6;">
            Thank you for applying! Please click the button below to verify your email address and activate your account.
          </p>
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#b8860b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.95rem;">
              Verify Email
            </a>
          </div>
          <p style="color:#7a7a8e;font-size:0.8rem;line-height:1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verifyUrl}" style="color:#b8860b;word-break:break-all;">${verifyUrl}</a>
          </p>
        </div>
        <p style="text-align:center;color:#7a7a8e;font-size:0.75rem;margin-top:1.5rem;">
          &copy; ${new Date().getFullYear()} BG Mesob. All rights reserved.
        </p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Verification email preview:', previewUrl);
  }

  return { messageId: info.messageId, previewUrl };
}

async function sendPasswordResetEmail(email, token, baseUrl) {
  const transport = await getTransporter();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"BG Mesob" <noreply@bgmesob.et>',
    to: email,
    subject: 'Reset Your Password — BG Mesob',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:system-ui,sans-serif;padding:2rem;">
        <div style="text-align:center;margin-bottom:1.5rem;">
          <h1 style="font-size:1.5rem;color:#1a1a2e;margin:0;"> BG Mesob</h1>
          <p style="color:#7a7a8e;font-size:0.85rem;">Internship Management Platform</p>
        </div>
        <div style="background:#faf8f5;border-radius:12px;padding:2rem;border:1px solid #e8e4de;">
          <h2 style="font-size:1.1rem;color:#1a1a2e;margin:0 0 1rem;">Reset Your Password</h2>
          <p style="color:#3d3d56;font-size:0.9rem;line-height:1.6;">
            We received a request to reset your password. Click the button below to choose a new password. This link expires in 1 hour.
          </p>
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:0.75rem 2rem;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.95rem;">
              Reset Password
            </a>
          </div>
          <p style="color:#7a7a8e;font-size:0.8rem;line-height:1.5;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="${resetUrl}" style="color:#b8860b;word-break:break-all;">${resetUrl}</a>
          </p>
          <p style="color:#7a7a8e;font-size:0.8rem;margin-top:1rem;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <p style="text-align:center;color:#7a7a8e;font-size:0.75rem;margin-top:1.5rem;">
          &copy; ${new Date().getFullYear()} BG Mesob. All rights reserved.
        </p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Password reset email preview:', previewUrl);
  }

  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, getTransporter };
