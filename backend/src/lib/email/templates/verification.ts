import { renderBaseTemplate } from "./base.js";
import { escapeHtml } from "../utils.js";
import type { VerificationEmailData, RenderedEmailResult } from "../types.js";

export function renderVerificationEmail(data: VerificationEmailData): RenderedEmailResult {
  const subject = "StockSense - Verify your email address";
  const preheader = "Verify your email address to complete your StockSense account setup.";
  const title = "Verify Your Email Address";
  const expiryText = data.expiresIn ?? "24 hours";

  const contentHtml = `
    <p style="margin-top: 0;">Thanks for creating a <strong>StockSense</strong> account.</p>
    <p>Please click the button below to verify your email address and activate your account access:</p>
  `;

  const contentText = `Thanks for creating a StockSense account. Please verify your email address to complete your account setup.\n\nThis verification link will expire in ${expiryText}.\n\nIf you did not create this account, you can safely ignore this email.`;

  const { html, text } = renderBaseTemplate({
    preheader,
    title,
    userName: data.userName,
    contentHtml: contentHtml + `<p style="font-size: 13px; color: #64748b; margin-top: 20px;">This verification link expires in <strong>${escapeHtml(expiryText)}</strong>.</p><p style="font-size: 13px; color: #94a3b8;">If you didn't create a StockSense account, you can safely ignore this email.</p>`,
    contentText,
    ctaText: "Verify Email Address",
    ctaUrl: data.verificationUrl,
    showFallbackLink: true,
  });

  return { subject, html, text };
}
