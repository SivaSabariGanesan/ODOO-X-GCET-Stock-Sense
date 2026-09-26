import { renderBaseTemplate } from "./base.js";
import { config } from "../../../app/config/index.js";
import type { WelcomeEmailData, RenderedEmailResult } from "../types.js";

export function renderWelcomeEmail(data: WelcomeEmailData): RenderedEmailResult {
  const subject = "Welcome to StockSense!";
  const preheader = "Your StockSense inventory management account is ready.";
  const title = "Welcome to StockSense";
  const loginUrl = data.loginUrl ?? config.app.url;

  const contentHtml = `
    <p style="margin-top: 0;">Your <strong>StockSense</strong> account is officially active and ready for use.</p>
    <p>StockSense gives you real-time visibility and audit logging across products, warehouse locations, stock movements, and inventory operations.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">Next Steps:</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        <li>Log in to your workspace dashboard.</li>
        <li>Review active warehouse locations and stock balances.</li>
        <li>Monitor low-stock alerts and operational movements.</li>
      </ul>
    </div>
  `;

  const contentText = `Welcome to StockSense!\n\nYour account is ready. You can now access the StockSense inventory management platform.\n\nLog in at: ${loginUrl}`;

  const { html, text } = renderBaseTemplate({
    preheader,
    title,
    userName: data.userName,
    contentHtml,
    contentText,
    ctaText: "Open StockSense Platform",
    ctaUrl: loginUrl,
    showFallbackLink: true,
  });

  return { subject, html, text };
}
