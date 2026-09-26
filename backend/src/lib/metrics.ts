import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

// ---------------------------------------------------------------------------
// Prometheus Central Metrics Registry
// ---------------------------------------------------------------------------
export const register = new Registry();

// Collect default Node.js / Bun process metrics (CPU, Memory, Event Loop)
collectDefaultMetrics({ register, prefix: "stocksense_process_" });

// ---------------------------------------------------------------------------
// 1. Application Info & Uptime Metrics
// ---------------------------------------------------------------------------
export const applicationInfo = new Gauge({
  name: "stocksense_application_info",
  help: "Information about StockSense backend instance",
  labelNames: ["version", "environment"],
  registers: [register],
});
applicationInfo.set({ version: "1.0.0", environment: process.env.NODE_ENV ?? "development" }, 1);

export const applicationUptime = new Gauge({
  name: "stocksense_application_uptime_seconds",
  help: "Uptime of StockSense application in seconds",
  registers: [register],
});
const startTime = Date.now();
setInterval(() => {
  try {
    applicationUptime.set((Date.now() - startTime) / 1000);
  } catch {}
}, 5000).unref();

// ---------------------------------------------------------------------------
// 2. HTTP Request Metrics (Low Cardinality)
// ---------------------------------------------------------------------------
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total count of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 3. Database Metrics
// ---------------------------------------------------------------------------
export const databaseQueriesTotal = new Counter({
  name: "database_queries_total",
  help: "Total PostgreSQL queries executed",
  labelNames: ["status"],
  registers: [register],
});

export const databaseQueryDurationSeconds = new Histogram({
  name: "database_query_duration_seconds",
  help: "PostgreSQL query execution latency",
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const databaseConnectionPoolActive = new Gauge({
  name: "database_connection_pool_active",
  help: "Active database connections",
  registers: [register],
});

// ---------------------------------------------------------------------------
// 4. AI Assistant Metrics & Token / Cost Tracking
// ---------------------------------------------------------------------------
export const aiRequestsTotal = new Counter({
  name: "ai_requests_total",
  help: "Total AI orchestrator chat requests",
  labelNames: ["model", "status"],
  registers: [register],
});

export const aiRequestDurationSeconds = new Histogram({
  name: "ai_request_duration_seconds",
  help: "AI response generation duration in seconds",
  labelNames: ["model", "status"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 12, 20],
  registers: [register],
});

export const aiInputTokensTotal = new Counter({
  name: "ai_input_tokens_total",
  help: "Total AI prompt input tokens consumed",
  labelNames: ["model"],
  registers: [register],
});

export const aiOutputTokensTotal = new Counter({
  name: "ai_output_tokens_total",
  help: "Total AI completion output tokens generated",
  labelNames: ["model"],
  registers: [register],
});

export const aiTokensTotal = new Counter({
  name: "ai_tokens_total",
  help: "Total combined AI tokens (input + output)",
  labelNames: ["model"],
  registers: [register],
});

export const aiEstimatedCostUsdTotal = new Counter({
  name: "ai_estimated_cost_usd_total",
  help: "Estimated AI provider cost in USD",
  labelNames: ["model"],
  registers: [register],
});

export const aiErrorsTotal = new Counter({
  name: "ai_errors_total",
  help: "Total AI execution errors",
  labelNames: ["model", "error_type"],
  registers: [register],
});

// Model Pricing Model ($ per 1,000 tokens) - Configurable
const AI_PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  "llama-3.3-70b-versatile": { inputPer1k: 0.00059, outputPer1k: 0.00079 },
  "llama-3.1-8b-instant": { inputPer1k: 0.00005, outputPer1k: 0.00008 },
  "llama3-70b-8192": { inputPer1k: 0.00059, outputPer1k: 0.00079 },
  "llama3-8b-8192": { inputPer1k: 0.00005, outputPer1k: 0.00008 },
  "default": { inputPer1k: 0.0005, outputPer1k: 0.0005 },
};

export function recordAiUsage(opts: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationSeconds: number;
  status: "success" | "error";
  errorType?: string;
}): void {
  try {
    const model = opts.model || "unknown";
    const status = opts.status;
    const input = Math.max(0, opts.inputTokens);
    const output = Math.max(0, opts.outputTokens);
    const total = input + output;

    aiRequestsTotal.inc({ model, status });
    aiRequestDurationSeconds.observe({ model, status }, Math.max(0, opts.durationSeconds));

    if (total > 0) {
      aiInputTokensTotal.inc({ model }, input);
      aiOutputTokensTotal.inc({ model }, output);
      aiTokensTotal.inc({ model }, total);

      const pricing = AI_PRICING[model] ?? AI_PRICING["default"];
      const cost = (input / 1000) * pricing.inputPer1k + (output / 1000) * pricing.outputPer1k;
      aiEstimatedCostUsdTotal.inc({ model }, cost);
    }

    if (status === "error") {
      aiErrorsTotal.inc({ model, error_type: opts.errorType ?? "unknown_error" });
    }
  } catch (err) {
    // Non-blocking catch
  }
}

// ---------------------------------------------------------------------------
// 5. WebSocket Metrics
// ---------------------------------------------------------------------------
export const websocketConnectionsActive = new Gauge({
  name: "websocket_connections_active",
  help: "Active WebSocket connection count",
  registers: [register],
});

export const websocketConnectionsTotal = new Counter({
  name: "websocket_connections_total",
  help: "Total WebSocket connection handshakes established",
  registers: [register],
});

export const websocketDisconnectsTotal = new Counter({
  name: "websocket_disconnects_total",
  help: "Total WebSocket disconnections",
  registers: [register],
});

export const websocketMessagesTotal = new Counter({
  name: "websocket_messages_total",
  help: "Total WebSocket messages broadcasted",
  labelNames: ["event_type"],
  registers: [register],
});

export const websocketErrorsTotal = new Counter({
  name: "websocket_errors_total",
  help: "Total WebSocket errors",
  labelNames: ["error_type"],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 6. Email Metrics
// ---------------------------------------------------------------------------
export const emailsSentTotal = new Counter({
  name: "emails_sent_total",
  help: "Total emails dispatched successfully",
  labelNames: ["template", "status"],
  registers: [register],
});

export const emailsFailedTotal = new Counter({
  name: "emails_failed_total",
  help: "Total email delivery failures",
  labelNames: ["template"],
  registers: [register],
});

export const emailDeliveryDurationSeconds = new Histogram({
  name: "email_delivery_duration_seconds",
  help: "Email sending duration in seconds",
  labelNames: ["template"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

// ---------------------------------------------------------------------------
// 7. Inventory Business Operations Metrics
// ---------------------------------------------------------------------------
export const stockMovementsTotal = new Counter({
  name: "stock_movements_total",
  help: "Total stock movement audit ledger records created",
  labelNames: ["movement_type"],
  registers: [register],
});

export const receiptsProcessedTotal = new Counter({
  name: "receipts_processed_total",
  help: "Total inbound receipts processed",
  labelNames: ["status"],
  registers: [register],
});

export const deliveriesProcessedTotal = new Counter({
  name: "deliveries_processed_total",
  help: "Total outbound deliveries processed",
  labelNames: ["status"],
  registers: [register],
});

export const transfersProcessedTotal = new Counter({
  name: "transfers_processed_total",
  help: "Total internal transfers executed",
  labelNames: ["status"],
  registers: [register],
});

export const adjustmentsProcessedTotal = new Counter({
  name: "adjustments_processed_total",
  help: "Total inventory adjustments applied",
  labelNames: ["status"],
  registers: [register],
});

export const lowStockAlertsTotal = new Counter({
  name: "low_stock_alerts_total",
  help: "Total low stock alert events triggered",
  registers: [register],
});

// ---------------------------------------------------------------------------
// 8. Security & Error Metrics
// ---------------------------------------------------------------------------
export const authenticationFailuresTotal = new Counter({
  name: "authentication_failures_total",
  help: "Total login or authentication failures",
  labelNames: ["reason"],
  registers: [register],
});

export const authorizationFailuresTotal = new Counter({
  name: "authorization_failures_total",
  help: "Total RBAC authorization permission denials (HTTP 403)",
  labelNames: ["required_role"],
  registers: [register],
});

export const rateLimitExceededTotal = new Counter({
  name: "rate_limit_exceeded_total",
  help: "Total rate limit threshold exceed events (HTTP 429)",
  labelNames: ["key_prefix"],
  registers: [register],
});

export const payloadTooLargeTotal = new Counter({
  name: "payload_too_large_total",
  help: "Total request payload size exceed events (HTTP 413)",
  registers: [register],
});
