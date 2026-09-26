import { renderBaseTemplate } from "./base.js";
import { escapeHtml } from "../utils.js";
import type { NotificationEmailData, RenderedEmailResult } from "../types.js";

export function renderNotificationEmail(data: NotificationEmailData): RenderedEmailResult {
  const subject = `StockSense - ${data.title}`;
  const preheader = data.preheader ?? data.title;
  const title = data.title;

  let infoBlockHtml = "";
  if (data.infoBlock) {
    infoBlockHtml = `
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px; color: #1e293b;">
        ${escapeHtml(data.infoBlock).replace(/\n/g, "<br>")}
      </div>
    `;
  }

  const contentHtml = `
    <div style="margin-top: 0; white-space: pre-line;">${escapeHtml(data.message)}</div>
    ${infoBlockHtml}
  `;

  const contentText = `${data.message}${data.infoBlock ? `\n\nDetails:\n${data.infoBlock}` : ""}`;

  const { html, text } = renderBaseTemplate({
    preheader,
    title,
    userName: data.userName,
    contentHtml,
    contentText,
    ctaText: data.ctaText,
    ctaUrl: data.ctaUrl,
    showFallbackLink: !!data.ctaUrl,
  });

  return { subject, html, text };
}
