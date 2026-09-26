import { renderBaseTemplate } from "./base.js";
import { escapeHtml } from "../utils.js";
import type { PasswordResetEmailData, RenderedEmailResult } from "../types.js";

export function renderPasswordResetEmail(data: PasswordResetEmailData): RenderedEmailResult {
  const subject = "StockSense - Password Reset Verification Code";
  const preheader = "Your password reset code for StockSense.";
  const title = "Password Reset Request";
  const otp = escapeHtml(data.otp);

  const contentHtml = `
    <p style="margin-top: 0;">We received a request to reset the password for your <strong>StockSense</strong> account.</p>
    <p>Use the 6-digit verification code below to complete your password reset:</p>

    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block;">${otp}</span>
    </div>

    <p style="font-size: 14px; color: #475569;">This code is valid for <strong>${data.expiresInMinutes} minutes</strong> and can only be used once.</p>
    <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">If you did not request a password reset, no further action is required and your account remains secure.</p>
  `;

  const contentText = `We received a request to reset your StockSense password.\n\nYour 6-digit verification code is: ${data.otp}\n\nThis code will expire in ${data.expiresInMinutes} minutes.\n\nIf you did not request a password reset, no action is required.`;

  const { html, text } = renderBaseTemplate({
    preheader,
    title,
    userName: data.userName,
    contentHtml,
    contentText,
    ctaText: data.resetUrl ? "Reset Password" : undefined,
    ctaUrl: data.resetUrl,
    showFallbackLink: !!data.resetUrl,
  });

  return { subject, html, text };
}
