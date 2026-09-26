// ---------------------------------------------------------------------------
// Environment & App Configuration
// ---------------------------------------------------------------------------

export const config = {
  port: Number(process.env.PORT ?? 3000),
  env: process.env.NODE_ENV ?? "development",

  jwt: {
    secret: process.env.JWT_SECRET ?? "stocksense_dev_secret_key_change_in_production_12345!",
    expiresInSeconds: 7 * 24 * 60 * 60, // 7 days
    cookieName: "stocksense_token",
  },

  otp: {
    expiresInMinutes: 10,
    maxAttempts: 5,
  },

  email: {
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "StockSense Security <noreply@stocksense.local>",
    supportEmail: process.env.SUPPORT_EMAIL ?? "support@stocksense.local",
  },
  app: {
    url: process.env.VITE_API_BASE_URL ?? "http://localhost:3000",
    name: "StockSense",
  },
};
