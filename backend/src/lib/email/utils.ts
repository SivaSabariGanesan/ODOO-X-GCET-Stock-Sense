/**
 * Safely escape HTML characters to prevent HTML injection/XSS in emails
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Render email-safe CTA Button Component using VML/Table fallback for maximum client compatibility
 */
export function renderButton(text: string, url: string): string {
  const safeText = escapeHtml(text);
  const safeUrl = escapeHtml(url);

  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
      <tr>
        <td align="center" style="border-radius: 6px; background-color: #4f46e5; text-align: center;">
          <a href="${safeUrl}" target="_blank" style="background-color: #4f46e5; border: 1px solid #4f46e5; border-radius: 6px; color: #ffffff; display: inline-block; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 15px; font-weight: 600; line-height: 44px; text-align: center; text-decoration: none; width: 100%; -webkit-text-size-adjust: none; padding: 0 24px;">
            ${safeText}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Render accessible fallback text link for CTA buttons
 */
export function renderFallbackLink(url: string): string {
  const safeUrl = escapeHtml(url);
  return `
    <div style="margin-top: 20px; padding: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #64748b; line-height: 1.5; word-break: break-all;">
      If the button above doesn't work, copy and paste this link into your web browser:<br>
      <a href="${safeUrl}" target="_blank" style="color: #4f46e5; text-decoration: underline;">${safeUrl}</a>
    </div>
  `.trim();
}
