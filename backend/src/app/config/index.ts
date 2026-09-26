// ---------------------------------------------------------------------------
// Environment & App Configuration with Startup Validation
// ---------------------------------------------------------------------------

export const config = {
  port: Number(process.env.PORT ?? 3001),
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
    url: process.env.VITE_API_BASE_URL ?? "http://localhost:3001",
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
    name: "StockSense",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  },

  db: {
    url: process.env.DATABASE_URL ?? "",
    poolSize: Number(process.env.POSTGRES_POOL_SIZE ?? 10),
  },
};

/**
 * Validates critical environment configuration at startup.
 * Prevents application from starting in production with missing critical variables.
 */
export function validateConfig(): void {
  const isProd = config.env === "production";
  const errors: string[] = [];

  if (!config.db.url) {
    errors.push("DATABASE_URL environment variable is missing.");
  }

  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("change_in_production")) {
      errors.push("JWT_SECRET must be set to a secure, non-default secret in production.");
    }

    if (isNaN(config.port) || config.port <= 0) {
      errors.push(`Invalid PORT configuration: ${process.env.PORT}`);
    }
  }

  if (errors.length > 0) {
    console.error("=================================================");
    console.error("❌ CRITICAL ENVIRONMENT CONFIGURATION ERRORS:");
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error("Application startup aborted.");
    console.error("=================================================");
    
    if (isProd || !config.db.url) {
      process.exit(1);
    }
  }
}
