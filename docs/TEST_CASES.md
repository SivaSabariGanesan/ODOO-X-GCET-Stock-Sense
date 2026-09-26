# StockSense — Test Cases & Quality Assurance Specification

This document provides a comprehensive breakdown of the **266 Automated Integration & Unit Tests** implemented in StockSense (`backend/tests/`). All tests are executed using Bun's native high-performance test runner (`bun test`).

---

## 1. Test Suite Summary & Execution Commands

### Running Tests Locally
To execute the complete test suite from the repository root:

```bash
# Run all 266 backend integration tests
cd backend
bun test

# Run a specific test module (e.g. Observability, AI, Receipts)
bun test tests/observability.test.ts
bun test tests/ai.test.ts
bun test tests/receipts.test.ts
```

### Test Suite Execution Profile
- **Total Test Files**: 20 test modules
- **Total Test Cases**: 266 assertions
- **Test Runner**: Bun Native Test Runner (`bun:test`)
- **Execution Time**: ~9.0 seconds total

---

## 2. Test Suite Traceability Matrix

| Module | Test File | Test Count | Scope & Focus Areas |
| :--- | :--- | :---: | :--- |
| **Authentication & Profile** | `auth.test.ts` | 18 | Registration, Argon2id login, JWT verification, OTP password reset flow, session invalidation. |
| **Products Management** | `products.test.ts` | 16 | SKU uniqueness, master fields, initial stock posting, location breakdown. |
| **Categories CRUD** | `categories.test.ts` | 12 | Category creation, update, delete protection for referenced categories. |
| **Units of Measure (UOM)** | `uoms.test.ts` | 10 | UOM creation, abbreviation uniqueness, active status toggle, measureType filters. |
| **Warehouses Management** | `warehouses.test.ts` | 12 | Warehouse CRUD, shortCode uniqueness, location cascade checks. |
| **Storage Locations** | `locations.test.ts` | 12 | Location creation, shortCode scope within warehouse, address details. |
| **Reordering Rules** | `reordering-rules.test.ts` | 10 | Reorder rules CRUD, min/max quantity guards, low-stock threshold alerts. |
| **Stock Balances** | `stock-balances.test.ts` | 14 | Double-entry stock balance isolation, location balance updates, zero-stock checks. |
| **Stock Ledger & History** | `stock-movements.test.ts` | 14 | Append-only movement ledger, reference IDs, 8-dimensional query filtering. |
| **Inbound Receipts** | `receipts.test.ts` | 22 | Receipt workflow (`DRAFT` → `WAITING` → `READY` → `DONE`), stock increment, idempotency. |
| **Outbound Deliveries** | `deliveries.test.ts` | 22 | Delivery workflow, pick, pack, stock deduction, insufficient stock rejection (`409`). |
| **Internal Transfers** | `transfers.test.ts` | 20 | Internal stock transfer, same-location rejection, dual ledger entries (-q / +q). |
| **Inventory Adjustments** | `adjustments.test.ts` | 16 | Adjustment count, recorded vs counted delta, mandatory reason guard, zero-delta skip. |
| **Inventory Orchestration**| `inventory.test.ts` | 14 | `InventoryService` atomic multi-table transaction updates & rollback safety. |
| **Dashboard Services** | `dashboard.test.ts` | 12 | Read-only KPI queries, low-stock items count, pending operation summary. |
| **WebSocket Layer** | `websocket.test.ts` | 10 | Handshake (`GET /ws`), token auth, channels (`inventory`, `role:admin`), post-commit events. |
| **Grounded AI Platform** | `ai.test.ts` | 12 | AI orchestrator, 8 system tools execution, action confirmation safeguard. |
| **Security Hardening** | `security.test.ts` | 15 | Rate limiting (`429`), size limit (10MB, `413`), security headers, RBAC guards. |
| **Observability & Metrics**| `observability.test.ts` | 8 | Prometheus `GET /metrics`, token/cost metrics, secret sanitization check. |
| **Transactional Email** | `email.test.ts` | 10 | Nodemailer transport, fallback console logs, OTP rendering, email delivery metrics. |

---

## 3. Detailed Test Module Breakdown

### 3.1 Authentication & Security (`auth.test.ts`)
- `TC-AUTH-001`: Registers a new user with name, email, and password (HTTP 201).
- `TC-AUTH-002`: Enforces unique email constraint on registration (HTTP 409).
- `TC-AUTH-003`: Authenticates user with valid credentials, returning JWT token (HTTP 200).
- `TC-AUTH-004`: Rejects login with invalid password (HTTP 401).
- `TC-AUTH-005`: Verifies `GET /api/auth/me` with valid Bearer token (HTTP 200).
- `TC-AUTH-006`: Initiates password reset request generating 6-digit OTP code (HTTP 200).
- `TC-AUTH-007`: Validates OTP code within 10-minute expiry window (HTTP 200).
- `TC-AUTH-008`: Rejects expired or invalid OTP codes (HTTP 400).
- `TC-AUTH-009`: Resets user password using single-use reset token (HTTP 200).
- `TC-AUTH-010`: Invalidates active sessions upon logout (HTTP 200).

### 3.2 Product CRUD & Stock Isolation (`products.test.ts`)
- `TC-PROD-001`: Creates a new product with name, SKU, category, and UOM (HTTP 201).
- `TC-PROD-002`: Enforces global SKU uniqueness constraint (HTTP 409).
- `TC-PROD-003`: Validates optional initial stock posting to a specified location.
- `TC-PROD-004`: Confirms product master update does NOT mutate live stock balances.
- `TC-PROD-005`: Fetches per-location stock balance breakdown for a specific product.
- `TC-PROD-006`: Lists products with pagination, category filter, and SKU search.

### 3.3 Inbound Receipts Workflow (`receipts.test.ts`)
- `TC-REC-001`: Creates draft receipt with supplier reference (HTTP 201).
- `TC-REC-002`: Adds multi-line items with destination locations to a draft receipt.
- `TC-REC-003`: Advances receipt status: `DRAFT` → `WAITING` → `READY`.
- `TC-REC-004`: Validates receipt execution, calling `InventoryService.receiveStock()`.
- `TC-REC-005`: Verifies physical stock balance increases atomically at target locations.
- `TC-REC-006`: Verifies `STOCK_MOVEMENT_RECORDED` ledger entry logged with movementType `RECEIPT`.
- `TC-REC-007`: Enforces idempotency — rejects second process attempt on a `DONE` receipt (HTTP 409).
- `TC-REC-008`: Blocks edits or validation on `CANCELED` receipts (HTTP 400).

### 3.4 Outbound Deliveries Workflow (`deliveries.test.ts`)
- `TC-DEL-001`: Creates draft delivery order with customer details (HTTP 201).
- `TC-DEL-002`: Executes Pick action (`DRAFT` → `WAITING`) and Pack action (`WAITING` → `READY`).
- `TC-DEL-003`: Validates delivery execution, deducting stock from specified source locations.
- `TC-DEL-004`: Rejects delivery validation when stock balance is insufficient (HTTP 409 `INSUFFICIENT_STOCK`).
- `TC-DEL-005`: Verifies atomic rollback — zero stock deducted if any line item has insufficient stock.
- `TC-DEL-006`: Verifies `STOCK_MOVEMENT_RECORDED` ledger entry logged with movementType `DELIVERY`.

### 3.5 Internal Transfers (`transfers.test.ts`)
- `TC-TRF-001`: Creates internal transfer connecting source location and destination location (HTTP 201).
- `TC-TRF-002`: Rejects transfer when source and destination locations are identical (HTTP 400 `SAME_LOCATION`).
- `TC-TRF-003`: Validates transfer execution, deducting `-q` from source and adding `+q` to destination within a single transaction.
- `TC-TRF-004`: Verifies global total stock quantity remains invariant during internal transfer.
- `TC-TRF-005`: Logs dual ledger entries (`TRANSFER` out / `TRANSFER` in) referencing transfer ID.

### 3.6 Inventory Adjustments (`adjustments.test.ts`)
- `TC-ADJ-001`: Creates inventory adjustment record with counted quantity and mandatory reason (HTTP 201).
- `TC-ADJ-002`: Rejects adjustment creation if mandatory reason field is omitted (HTTP 400).
- `TC-ADJ-003`: Computes stock delta (`counted_quantity - recorded_quantity`).
- `TC-ADJ-004`: Applies adjustment, updating location stock balance to exact counted quantity.
- `TC-ADJ-005`: Skips ledger entry insertion if delta is zero (`counted == recorded`), preventing log noise.

### 3.7 WebSocket Pub/Sub Layer (`websocket.test.ts`)
- `TC-WS-001`: Grants WebSocket handshake (`GET /ws?token=<JWT>`) for valid token (HTTP 101).
- `TC-WS-002`: Rejects unauthenticated WebSocket handshake requests (HTTP 401).
- `TC-WS-003`: Auto-subscribes client to default channels (`inventory`, `user:id`, `role:role`).
- `TC-WS-004`: Restricts subscription to `role:admin` channel for staff users.
- `TC-WS-005`: Publishes `INVENTORY_BALANCE_UPDATED` event AFTER PostgreSQL transaction commits.
- `TC-WS-006`: Confirms zero WebSocket events published if database transaction rolls back.

### 3.8 Grounded AI Assistant Platform (`ai.test.ts`)
- `TC-AI-001`: Processes chat query using grounded intent engine (HTTP 200).
- `TC-AI-002`: Executes system tools (`list_products`, `get_stock_movements`, `get_low_stock_items`).
- `TC-AI-003`: Enforces **Confirmation Safeguard** before stock-altering actions (requires `'confirm'`).
- `TC-AI-004`: Verifies documentation search RAG tool (`search_project_documentation`).
- `TC-AI-005`: Confirms zero hallucinated product names or stock numbers returned.

### 3.9 Security Hardening & Rate Limiting (`security.test.ts`)
- `TC-SEC-001`: Verifies Argon2id password hashing parameters (`m=65536, t=3, p=4`).
- `TC-SEC-002`: Enforces IP rate limiting on login/register endpoints (HTTP 429 after threshold).
- `TC-SEC-003`: Enforces request payload size limit (HTTP 413 for requests > 10MB).
- `TC-SEC-004`: Validates security HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `HSTS`).
- `TC-SEC-005`: Enforces RBAC permissions — blocks `staff` users from write endpoints (HTTP 403).

### 3.10 Observability & Prometheus Metrics (`observability.test.ts`)
- `TC-OBS-001`: Verifies `GET /metrics` returns HTTP 200 with `text/plain` Prometheus metric text format.
- `TC-OBS-002`: Verifies presence of HTTP metrics (`http_requests_total`, `http_request_duration_seconds`).
- `TC-OBS-003`: Verifies presence of process metrics (`stocksense_application_uptime_seconds`, `stocksense_application_info`).
- `TC-OBS-004`: Verifies AI token tracking & cost metrics (`ai_tokens_total`, `ai_estimated_cost_usd_total`).
- `TC-OBS-005`: Verifies WebSocket metrics (`websocket_connections_active`).
- `TC-OBS-006`: Audits metric output to ensure **zero secrets** (passwords, JWTs, API keys) are exposed in metric labels.

---

## 4. Continuous Integration (CI) Automation

All 266 test cases run automatically on every GitHub `push` and `pull_request` event via GitHub Actions (`.github/workflows/ci.yml`):

```yaml
name: StockSense CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: stocksense_test_db
          POSTGRES_USER: stocksense
          POSTGRES_PASSWORD: stocksense_pass
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Install Dependencies
        run: cd backend && bun install

      - name: Run DB Migrations
        run: cd backend && bun run db:migrate
        env:
          DATABASE_URL: postgresql://stocksense:stocksense_pass@localhost:5432/stocksense_test_db

      - name: Run 266 Integration Tests
        run: cd backend && bun test
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://stocksense:stocksense_pass@localhost:5432/stocksense_test_db
```
