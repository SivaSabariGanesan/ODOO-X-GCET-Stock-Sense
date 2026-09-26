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
};
