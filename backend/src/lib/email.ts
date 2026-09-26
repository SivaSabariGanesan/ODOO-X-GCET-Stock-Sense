import nodemailer from "nodemailer";
import { config } from "../app/config/index.js";
import {
  renderPasswordResetEmail,
  renderVerificationEmail,
  renderPasswordChangedEmail,
  renderWelcomeEmail,
  renderNotificationEmail,
  type RenderedEmailResult,
} from "./email/index.js";

// ---------------------------------------------------------------------------
// Email Dispatch Service
// ---------------------------------------------------------------------------
// Delivers polished transactional emails (Verification, Password Resets, Security Alerts,
// Welcome, Notifications) using Nodemailer SMTP or dev console fallback.
// ---------------------------------------------------------------------------

export class EmailService {
  private static getTransporter() {
    if (config.env === "test" || process.env.NODE_ENV === "test" || process.env.DISABLE_SMTP_TEST === "true") {
      return null;
    }
    if (config.email.smtpHost && config.email.smtpUser) {
      const isGmail = config.email.smtpHost.includes("gmail.com");

      if (isGmail) {
        return nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: config.email.smtpUser,
            pass: config.email.smtpPass, // exact string with spaces
          },
        });
      }

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

  private static async dispatch(to: string, rendered: RenderedEmailResult): Promise<boolean> {
    const transporter = this.getTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.email.from,
          to,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        console.log(`[EmailService] Email '${rendered.subject}' sent successfully to ${to}`);
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
      console.log(`Subject: ${rendered.subject}`);
      console.log(`Text Payload:\n${rendered.text}`);
      console.log("=======================================================\n");
      return true;
    }
  }

  /**
   * Send Password Reset OTP Email
   */
  static async sendPasswordResetOTP(to: string, otp: string, userName?: string): Promise<boolean> {
    const rendered = renderPasswordResetEmail({
      to,
      otp,
      userName,
      expiresInMinutes: config.otp.expiresInMinutes,
    });
    return await this.dispatch(to, rendered);
  }

  /**
   * Send Email Verification Link Email
   */
  static async sendEmailVerification(to: string, verificationUrl: string, userName?: string): Promise<boolean> {
    const rendered = renderVerificationEmail({
      to,
      verificationUrl,
      userName,
    });
    return await this.dispatch(to, rendered);
  }

  /**
   * Send Security Alert: Password Changed Email
   */
  static async sendPasswordChangedNotification(to: string, userName?: string): Promise<boolean> {
    const rendered = renderPasswordChangedEmail({
      to,
      userName,
      changedAt: new Date().toUTCString(),
    });
    return await this.dispatch(to, rendered);
  }

  /**
   * Send Account Welcome Email
   */
  static async sendWelcomeEmail(to: string, userName: string, loginUrl?: string): Promise<boolean> {
    const rendered = renderWelcomeEmail({
      to,
      userName,
      loginUrl,
    });
    return await this.dispatch(to, rendered);
  }

  /**
   * Send Generic Operational Notification Email
   */
  static async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    ctaText?: string,
    ctaUrl?: string,
    userName?: string
  ): Promise<boolean> {
    const rendered = renderNotificationEmail({
      to,
      title,
      message,
      ctaText,
      ctaUrl,
      userName,
    });
    return await this.dispatch(to, rendered);
  }
}
