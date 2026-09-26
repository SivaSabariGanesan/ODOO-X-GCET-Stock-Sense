// ---------------------------------------------------------------------------
// Transactional Email System Type Definitions
// ---------------------------------------------------------------------------

export interface BaseEmailProps {
  preheader?: string;
  title: string;
  userName?: string;
  contentHtml: string;
  contentText: string;
  ctaText?: string;
  ctaUrl?: string;
  showFallbackLink?: boolean;
}

export interface VerificationEmailData {
  to: string;
  userName?: string;
  verificationUrl: string;
  expiresIn?: string;
}

export interface PasswordResetEmailData {
  to: string;
  userName?: string;
  otp: string;
  expiresInMinutes: number;
  resetUrl?: string;
}

export interface PasswordChangedEmailData {
  to: string;
  userName?: string;
  changedAt?: string;
}

export interface WelcomeEmailData {
  to: string;
  userName: string;
  loginUrl?: string;
}

export interface NotificationEmailData {
  to: string;
  title: string;
  preheader?: string;
  userName?: string;
  message: string;
  infoBlock?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface RenderedEmailResult {
  subject: string;
  html: string;
  text: string;
}
