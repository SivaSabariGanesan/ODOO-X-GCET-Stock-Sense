# StockSense Monitoring & Observability Stack

This document describes the production-grade monitoring and observability architecture for StockSense built using **Prometheus**, **Grafana**, **Loki**, and **Promtail**.

---

## 1. Observability Architecture

```text
                        StockSense Application
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
     HTTP Metrics            App Logs           AI / Domain Events
           │                     │                     │
           ▼                     ▼                     ▼
   Prometheus Scraper       Promtail Driver     Internal Event Bus
    (GET /metrics)               │                     │
           │                     ▼                     │
           │                Loki Engine                │
           │                     │                     │
           └──────────┬──────────┘                     │
                      ▼                                │
              Grafana Dashboards ◄─────────────────────┘
              (Provisioned Port 3000)
```

---

## 2. Component Breakdown

| Component | Role | Scraping / Shipping Mechanism | Access Endpoint |
| :--- | :--- | :--- | :--- |
| **Prometheus** | Metrics collection & time-series storage | Scrapes `backend:3001/metrics` every 15s | `http://prometheus:9090` (Internal) |
| **Loki** | Centralized log aggregation & indexing | Receives logs pushed by Promtail | `http://loki:3100` (Internal) |
| **Promtail** | Container log collection & shipper | Tails Docker container stdout/stderr | `http://promtail:9080` (Internal) |
| **Grafana** | Dashboards & alert visualizations | Queries Prometheus and Loki datasources | `http://localhost:3000` (Configurable) |

---

## 3. Metrics Specification (`GET /metrics`)

The backend exposes standard Prometheus-compatible metrics on `GET /metrics`. Metric labels are strictly **low-cardinality** to prevent memory explosions (no `userId`, `email`, `requestId`, `full URL`, or database credentials).

### HTTP Request Metrics
- `http_requests_total{method, route, status}` — Total count of HTTP requests with normalized routes (e.g. `/api/products/:id`).
- `http_request_duration_seconds_bucket{method, route, status}` — Request latency histogram.

### Application Health & Info Metrics
- `stocksense_application_info{version, environment}` — Static instance metadata.
- `stocksense_application_uptime_seconds` — Backend process uptime.

### Database Metrics
- `database_queries_total{status}` — Total PostgreSQL query executions.
- `database_query_duration_seconds` — Query execution latency histogram.
- `database_connection_pool_active` — Gauge of active connection pool slots.

### AI Assistant & Token / Cost Tracking Metrics
- `ai_requests_total{model, status}` — Total AI orchestrator requests.
- `ai_request_duration_seconds{model, status}` — AI response generation latency histogram.
- `ai_input_tokens_total{model}` — Prompt input tokens consumed.
- `ai_output_tokens_total{model}` — Completion output tokens generated.
- `ai_tokens_total{model}` — Combined token count.
- `ai_estimated_cost_usd_total{model}` — Estimated USD cost based on model pricing rules.
- `ai_errors_total{model, error_type}` — AI generation errors.

### WebSocket Metrics
- `websocket_connections_active` — Gauge of currently connected clients.
- `websocket_connections_total` — Total handshakes established.
- `websocket_disconnects_total` — Total client disconnections.
- `websocket_messages_total{event_type}` — Messages broadcast by event type.
- `websocket_errors_total{error_type}` — WebSocket transmission failures.

### Email Metrics
- `emails_sent_total{template, status}` — Sent transactional emails count.
- `emails_failed_total{template}` — Failed email deliveries count.
- `emailDeliveryDurationSeconds{template}` — Dispatch latency histogram.

### Inventory Business Operations Metrics
- `stock_movements_total{movement_type}` — Total audit ledger entries recorded.
- `receipts_processed_total{status}` — Processed inbound receipts.
- `deliveries_processed_total{status}` — Processed outbound deliveries.
- `transfers_processed_total{status}` — Executed internal stock transfers.
- `adjustments_processed_total{status}` — Applied inventory adjustments.

### Security & Error Metrics
- `authentication_failures_total{reason}` — Failed login attempts.
- `authorization_failures_total{required_role}` — Permission denials (HTTP 403).
- `rate_limit_exceeded_total{key_prefix}` — Rate limit exceed events (HTTP 429).
- `payload_too_large_total` — Payload size exceed events (HTTP 413).

---

## 4. Provisioned Grafana Dashboards

Grafana is pre-configured with auto-provisioned datasources and dashboards located in `./docker/grafana/`:

1. **StockSense Overview Dashboard** (`stocksense-overview.json`):
   - Application Uptime & Process Stats
   - HTTP Request Rate & 95th Percentile Latency
   - HTTP 5xx Error Rate
   - Real-time Active WebSocket Connections
   - Inventory Activity (Receipts, Deliveries, Transfers, Adjustments)
   - Stock Movements Audit Log Rate

2. **StockSense AI Monitoring & Cost Dashboard** (`stocksense-ai.json`):
   - Total AI Requests & Token Consumption Today
   - Input vs Output Token Rates over time
   - Estimated USD Cost Today & Hourly Cost Rate by Model
   - AI Generation Latency (p95)
   - AI Error Rate & Breakdown

3. **StockSense Logs Dashboard** (`stocksense-logs.json`):
   - Centralized Loki log viewer with full text search
   - Log volume by severity level (`INFO`, `WARN`, `ERROR`)
   - Instant filtering by service (`backend`, `postgres`, `proxy`)

---

## 5. Alert Rules (`docker/prometheus/alert_rules.yml`)

Prometheus evaluates alert conditions every 15 seconds:

| Alert Name | Condition | Severity | Action |
| :--- | :--- | :--- | :--- |
| `BackendServiceDown` | `up{job="stocksense-backend"} == 0` for 1m | Critical | Inspect backend container logs |
| `HighApiErrorRate` | HTTP 5xx rate > 5% for 2m | Warning | Check error logs in Loki |
| `HighApiLatency` | p95 request latency > 2s for 3m | Warning | Check slow database queries or LLM timeouts |
| `HighDatabaseErrors` | DB query error rate > 1/s for 2m | Critical | Inspect PostgreSQL connection pool |
| `HighAiErrorRate` | AI error rate > 10% for 3m | Warning | Check LLM API key quota / network |
| `AiTokenUsageSpike` | Token rate > 100 tokens/s for 2m | Warning | Investigate runaway prompt loops |
| `WebSocketErrorSpike` | WS error rate > 0.5/s for 2m | Warning | Check connection handshakes |
| `EmailDeliveryFailures` | Email fail rate > 0.1/s for 3m | Warning | Verify SMTP server credentials |

---

## 6. Retention Policies & Volume Persistence

- **Prometheus Data**: Persisted to volume `stocksense_prometheus_prod_data`. Retains time-series samples up to 15 days or storage limits.
- **Loki Data**: Persisted to volume `stocksense_loki_prod_data`. Enforces a strict 7-day (168h) log retention period via Loki compactor.
- **Grafana Data**: Persisted to volume `stocksense_grafana_prod_data`. Retains user preferences, dashboard edits, and alert channels.

---

## 7. Operational Guidelines & Isolation Guarantees

1. **Graceful Monitoring Fallbacks**: All metric instruments in StockSense run asynchronously inside non-blocking try-catch guards. If Prometheus, Loki, or Grafana go down, the StockSense application continues serving traffic without interruption.
2. **Internal Network Isolation**: Prometheus, Loki, and Promtail run exclusively on internal bridge network `stocksense_net` without public port exposure.
3. **Log & Metric Sanitization**: Request bodies, OTP tokens, JWT secrets, passwords, and AI prompts are stripped before logs are emitted or metrics recorded.
