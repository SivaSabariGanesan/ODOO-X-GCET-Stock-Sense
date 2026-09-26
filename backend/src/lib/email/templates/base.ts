import { config } from "../../../app/config/index.js";
import { escapeHtml, renderButton, renderFallbackLink } from "../utils.js";
import type { BaseEmailProps } from "../types.js";

export function renderBaseTemplate(props: BaseEmailProps): { html: string; text: string } {
  const brandName = escapeHtml(config.app.name ?? "StockSense");
  const supportEmail = escapeHtml(config.email.supportEmail ?? "support@stocksense.local");
  const preheader = props.preheader ? escapeHtml(props.preheader) : "";
  const title = escapeHtml(props.title);
  const greeting = props.userName ? `Hello ${escapeHtml(props.userName)},` : "Hello,";

  const buttonHtml = props.ctaText && props.ctaUrl ? renderButton(props.ctaText, props.ctaUrl) : "";
  const fallbackHtml = props.showFallbackLink && props.ctaUrl ? renderFallbackLink(props.ctaUrl) : "";

  const html = `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .email-header { background-color: #0f172a; padding: 24px 32px; text-align: left; }
    .brand-logo { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; text-decoration: none; display: inline-block; }
    .brand-tag { background-color: #312e81; color: #c7d2fe; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .email-body { padding: 32px; }
    .email-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; line-height: 1.3; }
    .email-text { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
    .email-footer { background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer-link { color: #4f46e5; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 24px 20px !important; }
      .email-header { padding: 20px !important; }
      .email-footer { padding: 20px !important; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">${preheader}</div>` : ""}
  
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" role="presentation">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <span class="brand-logo">${brandName}</span>
              <span class="brand-tag">Inventory ERP</span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="email-body">
              <h1 class="email-title">${title}</h1>
              <p class="email-text">${greeting}</p>
              
              <div class="email-text">
                ${props.contentHtml}
              </div>

              ${buttonHtml}
              ${fallbackHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0 0 8px 0;"><strong>${brandName} Inventory Management Platform</strong></p>
              <p style="margin: 0 0 8px 0;">This is an automated operational notification. Please do not reply to this email.</p>
              <p style="margin: 0;">Need assistance? Contact support at <a href="mailto:${supportEmail}" class="footer-link">${supportEmail}</a></p>
              <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 11px;">&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const ctaSectionText = props.ctaUrl ? `\n\nLink: ${props.ctaUrl}` : "";
  const text = `${brandName.toUpperCase()} INVENTORY MANAGEMENT SYSTEM\n=========================================\n\n${title.toUpperCase()}\n\n${greeting}\n\n${props.contentText}${ctaSectionText}\n\n-----------------------------------------\nThis is an automated system message from ${brandName}.\nSupport: ${supportEmail}\n© ${new Date().getFullYear()} ${brandName}. All rights reserved.`.trim();

  return { html, text };
}
