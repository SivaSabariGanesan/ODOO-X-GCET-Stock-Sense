import { describe, it, expect } from "bun:test";
import app from "../src/server/index";
import { recordAiUsage, register } from "../src/lib/metrics";

describe("StockSense Observability & Prometheus Metrics", () => {
  it("should expose GET /metrics returning valid Prometheus metrics text format", async () => {
    const res = await app.request("/metrics", { method: "GET" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("http_requests_total");
    expect(text).toContain("stocksense_application_uptime_seconds");
    expect(text).toContain("stocksense_application_info");
    expect(text).toContain("ai_requests_total");
    expect(text).toContain("ai_tokens_total");
    expect(text).toContain("ai_estimated_cost_usd_total");
    expect(text).toContain("websocket_connections_active");
  });

  it("should record AI token usage and calculate estimated cost without throwing errors", async () => {
    recordAiUsage({
      model: "llama-3.3-70b-versatile",
      inputTokens: 150,
      outputTokens: 250,
      durationSeconds: 0.85,
      status: "success",
    });

    const metricsText = await register.metrics();
    expect(metricsText).toContain('model="llama-3.3-70b-versatile"');
    expect(metricsText).toContain("ai_input_tokens_total");
    expect(metricsText).toContain("ai_output_tokens_total");
    expect(metricsText).toContain("ai_estimated_cost_usd_total");
  });

  it("should not expose any sensitive credentials, JWTs, or secret keys in /metrics", async () => {
    const res = await app.request("/metrics", { method: "GET" });
    const text = await res.text();

    expect(text).not.toContain("Password123!");
    expect(text).not.toContain("JWT_SECRET");
    expect(text).not.toContain("gsk_");
    expect(text).not.toContain("postgresql://");
    expect(text).not.toContain("AI_API_KEY");
  });
});
