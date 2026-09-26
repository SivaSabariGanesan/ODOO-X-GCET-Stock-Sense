import { describe, it, expect } from "bun:test";
import { EmailService } from "../src/lib/email.js";
import {
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangedEmail,
  renderWelcomeEmail,
  renderNotificationEmail,
  escapeHtml,
  renderButton,
  renderFallbackLink,
} from "../src/lib/email/index.js";

describe("StockSense Transactional Email Template System", () => {
  describe("HTML Escaping & Utility Security", () => {
    it("escapes dangerous HTML characters to prevent XSS injection", () => {
      const maliciousInput = `<script>alert("XSS")</script> & "quotes" 'test'`;
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&amp;");
      expect(escaped).toContain("&quot;quotes&quot;");
      expect(escaped).toContain("&#039;test&#039;");
    });

    it("renders email-safe CTA buttons and fallback links", () => {
      const button = renderButton("Click Here", "https://example.com/verify?token=123");
      const fallback = renderFallbackLink("https://example.com/verify?token=123");

      expect(button).toContain("Click Here");
      expect(button).toContain("https://example.com/verify?token=123");
      expect(fallback).toContain("copy and paste this link into your web browser");
      expect(fallback).toContain("https://example.com/verify?token=123");
    });
  });

  describe("Email Verification Template", () => {
    it("renders valid HTML and plain text for email verification", () => {
      const result = renderVerificationEmail({
        to: "user@example.com",
        userName: "Jane Developer",
        verificationUrl: "http://localhost:3000/api/auth/verify?token=abc123xyz",
        expiresIn: "24 hours",
      });

      expect(result.subject).toBe("StockSense - Verify your email address");
      expect(result.html).toContain("Jane Developer");
      expect(result.html).toContain("Verify Your Email Address");
      expect(result.html).toContain("http://localhost:3000/api/auth/verify?token=abc123xyz");
      expect(result.text).toContain("StockSense");
      expect(result.text).toContain("24 hours");
    });
  });

  describe("Password Reset OTP Template", () => {
    it("renders valid HTML and plain text for password reset OTP", () => {
      const result = renderPasswordResetEmail({
        to: "user@example.com",
        userName: "Alex Admin",
        otp: "849201",
        expiresInMinutes: 10,
      });

      expect(result.subject).toBe("StockSense - Password Reset Verification Code");
      expect(result.html).toContain("Alex Admin");
      expect(result.html).toContain("849201");
      expect(result.html).toContain("10 minutes");
      expect(result.text).toContain("849201");
      expect(result.text).not.toContain("<div");
    });
  });

  describe("Password Changed Notification Template", () => {
    it("renders valid security alert email for password changes", () => {
      const result = renderPasswordChangedEmail({
        to: "user@example.com",
        userName: "Sam Manager",
        changedAt: "Sat, 26 Sep 2026 12:00:00 GMT",
      });

      expect(result.subject).toContain("Security Alert: Password Changed");
      expect(result.html).toContain("Sam Manager");
      expect(result.html).toContain("Sat, 26 Sep 2026 12:00:00 GMT");
      expect(result.html).toContain("Account Security Update Successful");
      expect(result.text).toContain("Sam Manager");
    });
  });

  describe("Welcome Email Template", () => {
    it("renders welcome email with next steps and dashboard CTA link", () => {
      const result = renderWelcomeEmail({
        to: "newuser@example.com",
        userName: "Taylor Smith",
        loginUrl: "http://localhost:3000/login",
      });

      expect(result.subject).toBe("Welcome to StockSense!");
      expect(result.html).toContain("Taylor Smith");
      expect(result.html).toContain("Next Steps:");
      expect(result.html).toContain("Open StockSense Platform");
      expect(result.text).toContain("Welcome to StockSense!");
    });
  });

  describe("Generic Notification Email Template", () => {
    it("renders customizable operational notification email", () => {
      const result = renderNotificationEmail({
        to: "warehouse@example.com",
        title: "Low Stock Alert: Coffee Beans",
        userName: "Warehouse Lead",
        message: "Stock for Coffee Beans at Warehouse A has fallen below threshold.",
        infoBlock: "Current Stock: 12 units\nMinimum Threshold: 50 units",
        ctaText: "View Stock Balance",
        ctaUrl: "http://localhost:3000/dashboard/low-stock",
      });

      expect(result.subject).toBe("StockSense - Low Stock Alert: Coffee Beans");
      expect(result.html).toContain("Low Stock Alert: Coffee Beans");
      expect(result.html).toContain("Current Stock: 12 units");
      expect(result.html).toContain("View Stock Balance");
      expect(result.text).toContain("Current Stock: 12 units");
    });
  });

  describe("EmailService Integration Dispatch", () => {
    it("dispatches transactional emails without throwing errors", async () => {
      const successReset = await EmailService.sendPasswordResetOTP("test@example.com", "123456", "Test User");
      expect(successReset).toBe(true);

      const successVerification = await EmailService.sendEmailVerification("test@example.com", "http://localhost:3000/verify", "Test User");
      expect(successVerification).toBe(true);

      const successChanged = await EmailService.sendPasswordChangedNotification("test@example.com", "Test User");
      expect(successChanged).toBe(true);

      const successWelcome = await EmailService.sendWelcomeEmail("test@example.com", "Test User");
      expect(successWelcome).toBe(true);

      const successNotif = await EmailService.sendNotificationEmail("test@example.com", "System Update", "All systems operational.");
      expect(successNotif).toBe(true);
    });
  });
});
