# StockSense — Production Infrastructure & Deployment Guide

This document provides a comprehensive operational guide for building, containerizing, configuring, deploying, and maintaining the StockSense Inventory Management System in a production environment.

---

## 1. System Requirements & Architecture Model

StockSense is deployed as a containerized stack featuring application services and isolated observability:

```text
                                  Internet
                                     │
                                     ▼
                          Reverse Proxy (Nginx)
                             │           │
                   HTTP/REST │           │ WebSocket (/ws)
                             ▼           ▼
                      Frontend / Backend Server ◄──────── Prometheus (/metrics)
                                 │                            │
                     ┌───────────┼───────────┐                ▼
                     ▼           ▼           ▼             Grafana
                 PostgreSQL     AI         Email              ▲
                     │         (Groq)     (Nodemailer)        │
                     ▼                                     Loki Engine
             Persistent Volume                                ▲
                                                              │
                                                        Promtail Shipper
```

### Minimum Hardware Recommendations
- **CPU**: 2-4 vCPUs
- **RAM**: 4-8 GB RAM (PostgreSQL pool, Bun backend, Prometheus, Loki, Grafana)
- **Disk**: 40 GB SSD (with persistent volume storage for PostgreSQL, Prometheus, Loki, and Grafana data)

---

## 2. Environment Variables Catalog

Configuration must be supplied via environment variables. **Never commit production secrets to source control.**

### 2.1 Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Placeholder | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Execution mode (`development`, `test`, `production`) |
| `PORT` | Yes | `3001` | Backend HTTP API server port |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/dbname` | Full PostgreSQL connection string |
| `POSTGRES_POOL_SIZE` | No | `10` | Maximum database connection pool size |
| `JWT_SECRET` | **Yes** | *[Must be set in production]* | Secret key for signing authentication JWT tokens |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Allowed frontend web origin for CORS |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS allowed origin list |
| `VITE_API_BASE_URL` | Yes | `http://localhost:3001` | Public API base URL used for email links & OpenAPI |
| `GEMINI_API_KEY` | No | `gsk_...` | Groq LLM API Key for AI Assistant (optional) |
| `AI_MODEL` | No | `llama-3.3-70b-versatile` | Target AI model ID |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP host for email notifications |
| `SMTP_PORT` | No | `587` | SMTP port (587 TLS / 465 SSL) |
| `SMTP_SECURE` | No | `false` | Enable TLS/SSL connection (`true`/`false`) |
| `SMTP_USER` | No | `your_email@domain.com` | SMTP authentication username |
| `SMTP_PASS` | No | `app_password` | SMTP authentication password / app token |
| `SMTP_FROM` | No | `"StockSense <noreply@domain.com>"` | Outgoing email sender header |

---

## 3. Startup Configuration Validation

At startup, StockSense runs `validateConfig()` in `backend/src/app/config/index.ts`:
1. Validates that `DATABASE_URL` is configured.
2. When `NODE_ENV=production`, asserts that `JWT_SECRET` is defined and is NOT the default development fallback key.
3. Asserts valid server port numbers.
4. If validation fails, logs a clear structured error and exits cleanly with `process.exit(1)` to prevent starting up in a corrupted state.

---

## 4. Production Startup Sequence

To ensure zero race conditions, execute deployment steps in the following sequence:

```text
1. Provision PostgreSQL 16 Database Instance & Volume
                  ↓
2. Configure Production Environment Variables (.env)
                  ↓
3. Execute Database Migrations: `bun run db:migrate`
                  ↓
4. Build Application Artifacts: `bun run build`
                  ↓
5. Start Backend Service & Verify `/health` and `/ready`
                  ↓
6. Start Reverse Proxy / Nginx & Serve Frontend
```

### 4.1 Step-by-Step Command Execution

#### 1. Run Database Migrations
```bash
bun --cwd backend run db:migrate
```
*Note*: Never run database seed script (`db:seed`) in production.

#### 2. Build Backend Bundle
```bash
bun --cwd backend run build
```

#### 3. Build Frontend Bundle
```bash
bun --cwd frontend run build
```

#### 4. Start Production Server
```bash
bun --cwd backend run start
```

---

## 5. Containerized Production Deployment (Docker Compose)

StockSense includes a production-ready Compose definition in `docker-compose.prod.yml`:

```bash
# Build and launch production stack in detached mode
docker compose -f docker-compose.prod.yml up --build -d

# Check status of container services
docker compose -f docker-compose.prod.yml ps

# Tail application logs
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 6. Health & Readiness Endpoints

| Endpoint | HTTP Method | Expected Status | Purpose |
|---|---|---|---|
| `/health` | `GET` | `200 OK` | **Liveness Check**: Verifies HTTP process is alive. Fast response without external service checks. |
| `/ready` | `GET` | `200 OK` / `503 Service Unavailable` | **Readiness Check**: Performs database ping query (`SELECT 1`). Returns `503` if DB is unreachable. |

### Sample Responses

#### Liveness (`GET /health`)
```json
{
  "status": "ok"
}
```

#### Readiness (`GET /ready`)
```json
{
  "status": "ready"
}
```

---

## 7. Graceful Shutdown Behavior

StockSense handles `SIGTERM` and `SIGINT` signals gracefully:
1. Receives shutdown signal (`SIGINT` or `SIGTERM`).
2. Stops accepting new HTTP requests.
3. Flushes and terminates active WebSocket connections.
4. Closes the PostgreSQL database pool (`queryClient.end({ timeout: 5 })`).
5. Exits cleanly with status code `0`.

---

## 8. Database Backup & Restore Procedure

### 8.1 Automated Backup (`pg_dump`)
Run a daily scheduled cron job to dump the database:

```bash
# Execute backup
docker exec -t stocksense_postgres_prod pg_dump -U stocksense -d stocksense_db -F c -b -v -f /tmp/stocksense_backup_$(date +%Y%m%m_%H%M%S).dump

# Copy backup file to secure external storage
docker cp stocksense_postgres_prod:/tmp/stocksense_backup_*.dump ./backups/
```

### 8.2 Restore Procedure (`pg_restore`)
To restore from a backup file to a fresh database:

```bash
# Copy dump file to database container
docker cp ./backups/stocksense_backup_file.dump stocksense_postgres_prod:/tmp/backup.dump

# Execute restore
docker exec -t stocksense_postgres_prod pg_restore -U stocksense -d stocksense_db -clean --if-exists /tmp/backup.dump
```

---

## 9. Production Smoke-Test Checklist

Before opening user traffic, verify all core paths:

- [ ] `GET /health` returns HTTP `200 OK` (`{"status":"ok"}`).
- [ ] `GET /ready` returns HTTP `200 OK` (`{"status":"ready"}`).
- [ ] `POST /api/auth/login` accepts admin credentials and issues a valid JWT token.
- [ ] `GET /api/products` returns product catalog array.
- [ ] `GET /api/dashboard` returns aggregated KPI stats.
- [ ] `GET /ws?token=<JWT>` succeeds and completes WebSocket handshake upgrade.
- [ ] `POST /api/ai/chat` responds to test prompt cleanly.

---

## 10. Observability & Key Monitoring Metrics

Monitor these core signals in production:
1. **Liveness & Readiness**: HTTP status of `/health` and `/ready`.
2. **HTTP Error Rate**: Percentage of HTTP 5xx responses.
3. **Database Connection Pool**: Active connection count against `POSTGRES_POOL_SIZE`.
4. **WebSocket Active Connections**: Socket count on `GET /ws`.
5. **Container Restarts**: Restart count via `docker ps` or Kubernetes pods.
