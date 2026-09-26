import { describe, it, expect, beforeAll } from "bun:test";
import app from "../src/server/index.js";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const ADMIN_EMAIL = `ai_admin_${TEST_TIMESTAMP}@example.com`;
const STAFF_EMAIL = `ai_staff_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

describe("StockSense AI Assistant Module", () => {
  let adminToken = "";
  let staffToken = "";

  beforeAll(async () => {
    // 1. Register Admin user
    const adminRegRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AI Admin",
        email: ADMIN_EMAIL,
        password: TEST_PASSWORD,
        role: "admin",
      }),
    });
    expect(adminRegRes.status).toBe(201);

    const adminLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: TEST_PASSWORD }),
    });
    expect(adminLoginRes.status).toBe(200);
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;

    // 2. Register Staff user
    const staffRegRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AI Staff User",
        email: STAFF_EMAIL,
        password: TEST_PASSWORD,
        role: "staff",
      }),
    });
    expect(staffRegRes.status).toBe(201);

    const staffLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: STAFF_EMAIL, password: TEST_PASSWORD }),
    });
    expect(staffLoginRes.status).toBe(200);
    const staffLoginData = await staffLoginRes.json();
    staffToken = staffLoginData.token;
  });

  it("rejects unauthenticated POST /api/ai/chat requests with HTTP 401", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What products exist?" }),
    });

    expect(res.status).toBe(401);
  });

  it("answers product queries grounded in database records", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "What products do we have in StockSense?" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.answer).toBeDefined();
    expect(body.data.confirmationRequired).toBe(false);
  });

  it("answers low stock queries without hallucinating fake stock numbers", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "Which products are low in stock?" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.answer).toBeDefined();
    expect(body.data.sources).toContain("StockBalanceService");
  });

  it("answers project documentation & API contract questions", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "What API endpoint should the frontend use to get low stock items?" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.answer).toBeDefined();
    expect(body.data.sources).toContain("docs/API_INTEGRATION.md");
  });

  it("handles queries for unknown non-existent products honestly", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "How much stock do we have for Product NONEXISTENT_SKU_9999?" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.answer).toContain("couldn't find");
  });

  it("requires confirmation before executing inventory action tools", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "Process receipt rec_test_id_12345" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.confirmationRequired).toBe(true);
    expect(body.data.actionPending.tool).toBe("process_receipt");
    expect(body.data.answer).toContain("confirmAction: true");
  });

  it("enforces RBAC restrictions on inventory actions for staff users", async () => {
    const res = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ message: "Process receipt rec_test_id_12345", confirmAction: true }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("lists all registered AI tools via GET /api/ai/tools", async () => {
    const res = await app.request("/api/ai/tools", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tools).toBeInstanceOf(Array);
    expect(body.data.tools.length).toBeGreaterThan(5);
  });
});
