import nodemailer from "nodemailer";
import { config } from "../app/config";

// ---------------------------------------------------------------------------
// Email Dispatch Service
// ---------------------------------------------------------------------------
// Delivers transactional emails (Password Reset OTPs, notifications).
// Uses SMTP via Nodemailer when configured, or logs formatted message to
// console in development mode.
// ---------------------------------------------------------------------------

export class EmailService {
  private static getTransporter() {
    if (config.email.smtpHost && config.email.smtpUser) {
      return nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpSecure,
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass,
        },
      });
    }
    return null;
  }

  /**
   * Send Password Reset OTP Email
   */
  static async sendPasswordResetOTP(to: string, otp: string): Promise<boolean> {
    const subject = "StockSense - Password Reset Verification Code";
    
    const textContent = `
Hello,

You requested a password reset for your StockSense account.
Your 6-digit verification code is:

${otp}

This code will expire in ${config.otp.expiresInMinutes} minutes.
If you did not request this password reset, please ignore this email or contact support.

Regards,
StockSense Security Team
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 20px; text-align: center; }
    .otp-box { background: #f1f5f9; border-radius: 6px; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin: 25px 0; border: 1px solid #e2e8f0; }
    .footer { font-size: 13px; color: #64748b; margin-top: 25px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">🔒 Password Reset Code</div>
    <p style="color: #334155; font-size: 15px;">Hello,</p>
    <p style="color: #334155; font-size: 15px;">You requested a password reset for your <strong>StockSense</strong> account. Use the verification code below to complete the reset process:</p>
    
    <div class="otp-box">${otp}</div>
    
    <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>${config.otp.expiresInMinutes} minutes</strong> and can only be used once.</p>
    <p style="color: #94a3b8; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
    
    <div class="footer">
      StockSense Inventory Management System
    </div>
  </div>
</body>
</html>
    `.trim();

    const transporter = this.getTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.email.from,
          to,
          subject,
          text: textContent,
          html: htmlContent,
        });
        console.log(`[EmailService] Password reset OTP sent successfully to ${to}`);
        return true;
      } catch (err) {
        console.error(`[EmailService] Failed to send email via SMTP to ${to}:`, err);
        return false;
      }
    } else {
      // Development console fallback log
      console.log("\n=======================================================");
      console.log(`📧 [EMAIL DISPATCH - DEV CONSOLE TRANSPORT]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Expires in: ${config.otp.expiresInMinutes} minutes`);
      console.log("=======================================================\n");
      return true;
    }
  }
}
