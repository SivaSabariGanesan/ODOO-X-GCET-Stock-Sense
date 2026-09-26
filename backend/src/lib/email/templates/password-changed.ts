import { renderBaseTemplate } from "./base.js";
import { escapeHtml } from "../utils.js";
import type { PasswordChangedEmailData, RenderedEmailResult } from "../types.js";

export function renderPasswordChangedEmail(data: PasswordChangedEmailData): RenderedEmailResult {
  const subject = "StockSense - Security Alert: Password Changed";
  const preheader = "Your StockSense account password was successfully updated.";
  const title = "Your Password Was Changed";
  const changedTime = data.changedAt ? escapeHtml(data.changedAt) : new Date().toUTCString();

  const contentHtml = `
    <p style="margin-top: 0;">Your <strong>StockSense</strong> account password was successfully changed on <strong>${changedTime}</strong>.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">✓ Account Security Update Successful</p>
    </div>
    <p style="font-size: 14px; color: #475569;">If you performed this action, no further steps are necessary.</p>
    <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin-bottom: 0;">
      ⚠️ If you did NOT change your password, please contact your StockSense system administrator immediately.
    </p>
  `;

  const contentText = `Your StockSense account password was successfully changed on ${changedTime}.\n\nIf you made this change, no further action is required.\n\nIf you did not make this change, please contact your StockSense system administrator or support team immediately.`;

  const { html, text } = renderBaseTemplate({
    preheader,
    title,
    userName: data.userName,
    contentHtml,
    contentText,
  });

  return { subject, html, text };
}
