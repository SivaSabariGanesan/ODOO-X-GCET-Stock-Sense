import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../src/server/index";

describe("StockSense Security Hardening & Isolation Suite", () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Register test admin user
    const adminRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Security Admin",
        email: `sec_admin_${Date.now()}@stocksense.io`,
        password: "StockSenseSec2026!",
        role: "admin",
      }),
    });
    const adminData = await adminRes.json();
    const adminLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminData.user.email,
        password: "StockSenseSec2026!",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;

    // Register test staff user
    const staffRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Security Staff",
        email: `sec_staff_${Date.now()}@stocksense.io`,
        password: "StockSenseSec2026!",
        role: "staff",
      }),
    });
    const staffData = await staffRes.json();
    const staffLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: staffData.user.email,
        password: "StockSenseSec2026!",
      }),
    });
    const staffLoginData = await staffLoginRes.json();
    staffToken = staffLoginData.token;
  });

  // 1. Unauthenticated Route Rejection
  it("rejects unauthenticated requests to protected endpoints with HTTP 401", async () => {
    const res = await app.request("/api/products", { method: "GET" });
    expect(res.status).toBe(401);
  });

  // 2. Invalid Token Rejection
  it("rejects request with invalid or tampered JWT token", async () => {
    const res = await app.request("/api/products", {
      method: "GET",
      headers: { Authorization: "Bearer invalid_tampered_token_string" },
    });
    expect(res.status).toBe(401);
  });

  // 3. Security Headers
  it("attaches required security headers to HTTP responses", async () => {
    const res = await app.request("/health", { method: "GET" });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  // 4. Request Correlation ID
  it("attaches x-request-id header to response for end-to-end tracing", async () => {
    const res = await app.request("/health", {
      method: "GET",
      headers: { "x-request-id": "custom_sec_test_id_999" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("custom_sec_test_id_999");
  });

  // 5. Oversized Request Body Rejection (413 Payload Too Large)
  it("rejects oversized request bodies with HTTP 413", async () => {
    const res = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "content-length": "15000000", // 15MB
      },
      body: JSON.stringify({ name: "oversized" }),
    });
    expect(res.status).toBe(413);
  });

  // 6. RBAC Verification on Mutating Endpoints
  it("enforces RBAC permissions on warehouse creation", async () => {
    const res = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`, // Non-admin staff user
      },
      body: JSON.stringify({ name: "Unauthorized WH", shortCode: "UWH01" }),
    });
    expect(res.status).toBe(403);
  });

  // 7. Input Validation & Error Sanitation
  it("sanitizes error responses and returns HTTP 400 for malformed JSON", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed_json ",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  // 8. AI Tool Execution RBAC Safeguard
  it("blocks non-admin users from executing inventory action tools via AI", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ message: "Process receipt REC-001", confirmAction: true }),
    });
    expect(res.status).toBe(403);
  });
});
