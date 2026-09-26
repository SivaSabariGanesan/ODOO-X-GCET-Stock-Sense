import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
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
// Dynamic SMTP Credential Resolver
// ---------------------------------------------------------------------------
// Reads fresh credentials from .env if present on disk so changes immediately
// apply to the running process without requiring full server restarts.
// ---------------------------------------------------------------------------
function getLiveSmtpConfig() {
  let pass = process.env.SMTP_PASS || config.email.smtpPass;
  let user = process.env.SMTP_USER || config.email.smtpUser;
  let host = process.env.SMTP_HOST || config.email.smtpHost;

  try {
    const cwd = process.cwd();
    const candidateFiles = [
      path.resolve(cwd, ".env"),
      path.resolve(cwd, "backend", ".env"),
      path.resolve(cwd, "..", ".env"),
    ];
    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        const text = fs.readFileSync(file, "utf8");
        const matchPass = text.match(/^SMTP_PASS=(.+)$/m);
        const matchUser = text.match(/^SMTP_USER=(.+)$/m);
        const matchHost = text.match(/^SMTP_HOST=(.+)$/m);
        if (matchPass?.[1]) pass = matchPass[1].trim().replace(/^["']|["']$/g, "");
        if (matchUser?.[1]) user = matchUser[1].trim().replace(/^["']|["']$/g, "");
        if (matchHost?.[1]) host = matchHost[1].trim().replace(/^["']|["']$/g, "");
        if (matchPass?.[1]) break;
      }
    }
  } catch {}

  return {
    host,
    user,
    pass,
    isGmail: host.includes("gmail.com"),
  };
}

// ---------------------------------------------------------------------------
// Email Dispatch Service
// ---------------------------------------------------------------------------
// Delivers polished transactional emails (Verification, Password Resets, Security Alerts,
// Welcome, Notifications) using Nodemailer SMTP or dev console fallback.
// ---------------------------------------------------------------------------

import { emailsSentTotal, emailsFailedTotal, emailDeliveryDurationSeconds } from "./metrics.js";

export class EmailService {
  private static getTransporter() {
    if (config.env === "test" || process.env.NODE_ENV === "test" || process.env.DISABLE_SMTP_TEST === "true") {
      return null;
    }

    const smtp = getLiveSmtpConfig();

    if (smtp.host && smtp.user && smtp.pass) {
      if (smtp.isGmail) {
        return nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtp.user,
            pass: smtp.pass,
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });
      }

      return nodemailer.createTransport({
        host: smtp.host,
        port: config.email.smtpPort,
        secure: config.email.smtpSecure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
    }
    return null;
  }

  private static async dispatch(to: string, rendered: RenderedEmailResult, template = "general"): Promise<boolean> {
    const start = Date.now();
    const transporter = this.getTransporter();

    try {
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
          try {
            emailsSentTotal.inc({ template, status: "success" });
          } catch {}
          return true;
        } catch (err) {
          console.error(`[EmailService] Failed to send email via SMTP to ${to}:`, err);
          try {
            emailsFailedTotal.inc({ template });
          } catch {}
          // Development fallback log so OTP is always visible in terminal
          console.log("\n=======================================================");
          console.log(`📧 [EMAIL DISPATCH - DEV CONSOLE FALLBACK TRANSPORT]`);
          console.log(`To: ${to}`);
          console.log(`Subject: ${rendered.subject}`);
          console.log(`Text Payload:\n${rendered.text}`);
          console.log("=======================================================\n");
          return true;
        }
      } else {
        // Development console fallback log
        console.log("\n=======================================================");
        console.log(`📧 [EMAIL DISPATCH - DEV CONSOLE TRANSPORT]`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${rendered.subject}`);
        console.log(`Text Payload:\n${rendered.text}`);
        console.log("=======================================================\n");
        try {
          emailsSentTotal.inc({ template, status: "success" });
        } catch {}
        return true;
      }
    } finally {
      try {
        emailDeliveryDurationSeconds.observe({ template }, (Date.now() - start) / 1000);
      } catch {}
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
    return await this.dispatch(to, rendered, "password_reset");
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
    return await this.dispatch(to, rendered, "verification");
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
    return await this.dispatch(to, rendered, "password_changed");
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
    return await this.dispatch(to, rendered, "welcome");
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
    return await this.dispatch(to, rendered, "notification");
  }
}
