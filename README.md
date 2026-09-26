# StockSense — Enterprise Inventory Management System & AI Platform

StockSense is a high-performance, full-stack enterprise inventory management platform designed for multi-warehouse manufacturing and logistics operations. Built on a modern **Bun + Hono + Drizzle ORM + PostgreSQL** architecture with a **React 18 + Vite** frontend, StockSense features double-entry stock isolation, real-time WebSocket event streaming, a grounded AI assistant with tool execution, transactional HTML email notifications, and an immutable movement ledger.

---

## 🌟 Key Features & End-to-End Capabilities

- **Double-Entry Inventory Engine**: Strict stock isolation where physical stock quantity lives exclusively in `stock_balances(product_id, location_id)`. Master product records store metadata, never mutable counts.
- **Single-Transaction Atomicity**: Inbound Receipts, Outbound Deliveries, Internal Transfers, and Inventory Adjustments execute balance updates and write immutable movement ledger entries within single database transactions.
- **Immutable Audit Movement Ledger**: Unalterable movement history logged to `stock_movements` for every physical stock change.
- **Grounded AI Assistant Orchestrator**: Project AI Assistant powered by Groq LLMs (`llama-3.3-70b-versatile`) backed by a grounded tool execution engine (`list_products`, `get_stock_movements`, `get_low_stock_items`, `get_dashboard_summary`, `search_project_documentation`).
- **AI Action Confirmation Safeguard**: Multi-step user confirmation required before the AI executes stock-mutating actions (receipts, deliveries, transfers, adjustments).
- **Real-Time WebSocket Pub/Sub Layer**: Authenticated WebSocket server (`GET /ws`) broadcasting live stock events after database transaction commits to `inventory`, `user:id`, and `role:admin` channels.
- **Transactional Email Notification System**: Responsive HTML email rendering via Nodemailer for email verification and 6-digit OTP password resets with 10-minute expiry windows.
- **50-Product Extended Seed Dataset**: Comprehensive database seeder (`bun run db:seed`) populating 50+ diverse industrial products, categories, UOMs, warehouses, locations, reorder rules, and initial stock balances.
- **255 End-to-End Tests**: Complete test suite across 18 backend module test files built using Bun's native test runner (`bun test`).

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime** | [Bun](https://bun.sh) v1.3+ | Fast JavaScript/TypeScript runtime & package manager |
| **Backend Framework** | [Hono](https://hono.dev) v3 | Ultra-fast lightweight web framework for Bun |
| **Frontend UI** | React 18 + Vite 5 | SPA built with Custom CSS Design System & Lucide Icons |
| **Database** | PostgreSQL 16 | Relational database containerized via Docker Compose |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL builder & schema manager |
| **Real-Time Messaging** | WebSockets (Hono + Bun WS) | Event-driven WebSocket pub/sub broadcasting |
| **AI Assistant** | Groq API (`llama-3.3-70b`) | AI Orchestrator with grounded tool execution & fallbacks |
| **Mail Service** | Nodemailer | Transactional HTML email rendering & SMTP delivery |
| **Validation** | Zod + React Hook Form | End-to-end request schema validation |
| **Testing** | `bun:test` | Native test execution runner for 255 integration tests |

---

## 🏗️ System Architecture

```text
                               ┌──────────────────────────────────────────┐
                               │       React 18 + Vite SPA Frontend       │
                               │   (Vanilla CSS Design Tokens + React)   │
                               └────────────────────┬─────────────────────┘
                                                    │ HTTP REST API & WebSockets
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Hono 3 Web Server & WebSocket Engine (Bun Runtime)                                                      │
├─────────────────┬──────────────────┬─────────────────┬──────────────────┬────────────────┬──────────────┤
│ Auth & Users    │ Inventory Engine │ AI Orchestrator │ Real-Time WS     │ Mail Sender    │ Dashboard    │
│ (JWT + OTP)     │ (Receipts/Move)  │ (Groq + Tools)  │ (EventBus)       │ (Nodemailer)   │ Aggregator   │
└────────┬────────┴────────┬─────────┴────────┬────────┴────────┬─────────┴────────┬───────┴──────┬───────┘
         │                 │                  │                 │                  │              │
         ▼                 ▼                  ▼                 ▼                  ▼              ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ PostgreSQL 16 Database (Drizzle ORM)                                                                 │
 │ 18 Tables: Users, Products, Categories, UOMs, Warehouses, Locations, StockBalances, Movements...     │
 └──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Subsystems Implemented

### 1. Inventory Engine & Double-Entry Principles
- **Stock Isolation**: Product quantities exist strictly in `stock_balances(product_id, location_id)`.
- **Atomic Operations**: Operations run inside PostgreSQL transactions (`db.transaction()`). If an item is out of stock or location fails, the entire transaction rolls back cleanly.
- **Document Lifecycles**: Documents follow state machines (`DRAFT` → `READY` → `DONE` / `CANCELED`). Direct modifications are blocked on processed or canceled documents.

### 2. Grounded AI Assistant Platform (`/api/ai`)
- **Location**: `backend/src/modules/ai/orchestrator.ts`
- **Zero Hallucinations**: Grounded in project tool handlers (`list_products`, `get_product_details`, `get_low_stock_items`, `get_stock_movements`, `list_warehouses`, `get_dashboard_summary`, `search_project_documentation`).
- **Confirmation Safeguard**: Inventory actions require explicit user confirmation before execution.
- **Fallback Execution**: Auto-falls back to local grounded query logic if Groq API keys are missing.

### 3. Real-Time WebSocket Messaging (`GET /ws`)
- **Pub/Sub Channels**:
  - `inventory`: Global stock changes and movement broadcasts
  - `role:admin` / `role:manager`: Role-scoped system notifications
  - `user:id`: Targeted user alerts
- **Post-Commit Guarantee**: Events are dispatched to clients **after** DB transaction commit.

### 4. Transactional Email Notification System
- **HTML Layouts**: Custom HTML templates for Email Verification and 6-Digit Password Reset OTPs.
- **Nodemailer Transport**: Sends via SMTP (Gmail or custom provider) with fallback console logger for development.

---

## 🗄️ Database Schema Reference (18 Tables)

StockSense uses **18 PostgreSQL tables** managed with Drizzle ORM:

```text
├── Master Data: users, categories, units_of_measure, products, warehouses, locations, reorder_rules
├── Core Inventory: stock_balances (product_id + location_id primary key)
├── Audit Trail: stock_movements (immutable audit log)
├── Inbound: receipts, receipt_items
├── Outbound: deliveries, delivery_items
├── Inter-Facility: internal_transfers, internal_transfer_items
├── Adjustments: inventory_adjustments, inventory_adjustment_items
└── Bill of Materials: recipes, recipe_items
```

### Table Specifications

| # | Table Name | Primary Key | Key Foreign Keys | Purpose & Key Columns |
|---|---|---|---|---|
| **1** | `users` | `id` (UUID) | — | User accounts: `email` (unique), `password_hash`, `role` (`admin`/`manager`/`user`), `is_email_verified`. |
| **2** | `password_reset_otps` | `id` (UUID) | `user_id` → `users(id)` | Hashed 6-digit OTP codes with `expires_at` and `attempts_count`. |
| **3** | `categories` | `id` (UUID) | `parent_id` → `categories(id)` | Product hierarchy: `name`, `code` (unique), `description`. |
| **4** | `units_of_measure` | `id` (UUID) | — | Measurement units: `name`, `abbreviation` (unique), `measure_type` (`unit`/`weight`/`volume`/`length`). |
| **5** | `products` | `id` (UUID) | `category_id`, `uom_id` | Master catalog: `sku` (unique), `name`, `barcode`, `is_active`, `created_at`. |
| **6** | `warehouses` | `id` (UUID) | — | Physical facilities: `name`, `short_code` (unique), `address`, `is_active`. |
| **7** | `locations` | `id` (UUID) | `warehouse_id` | Sub-locations: `name`, `code`, `location_type` (`shelf`/`aisle`/`bin`/`dock`), `warehouse_id`. |
| **8** | `reorder_rules` | `id` (UUID) | `product_id`, `location_id` | Automated rules: `min_quantity`, `max_quantity`, `reorder_quantity`. |
| **9** | `stock_balances` | Composite `(product_id, location_id)` | `product_id`, `location_id` | **Physical Source of Truth**: `available_quantity`, `reserved_quantity`, `last_updated`. |
| **10** | `stock_movements` | `id` (UUID) | `product_id`, `location_id`, `created_by` | **Immutable Ledger**: `movement_type`, `quantity_change`, `reference_number`, `created_at`. |
| **11** | `receipts` | `id` (UUID) | `destination_warehouse_id`, `created_by` | Inbound documents: `receipt_number` (unique), `status` (`DRAFT`/`READY`/`DONE`/`CANCELED`), `received_date`. |
| **12** | `receipt_items` | `id` (UUID) | `receipt_id`, `product_id`, `location_id` | Inbound lines: `quantity_received`, `unit_price`, `total_price`. |
| **13** | `deliveries` | `id` (UUID) | `source_warehouse_id`, `created_by` | Outbound documents: `delivery_number` (unique), `status`, `customer_name`, `shipped_date`. |
| **14** | `delivery_items` | `id` (UUID) | `delivery_id`, `product_id`, `location_id` | Outbound lines: `quantity_shipped`, `unit_price`. |
| **15** | `internal_transfers` | `id` (UUID) | `source_warehouse_id`, `dest_warehouse_id` | Inter-facility transfers: `transfer_number` (unique), `status`, `transferred_date`. |
| **16** | `internal_transfer_items` | `id` (UUID) | `transfer_id`, `product_id`, `source_loc_id`, `dest_loc_id` | Transfer lines: `quantity_transferred`. |
| **17** | `inventory_adjustments` | `id` (UUID) | `warehouse_id`, `created_by` | Count adjustments: `adjustment_number` (unique), `reason`, `status`. |
| **18** | `inventory_adjustment_items` | `id` (UUID) | `adjustment_id`, `product_id`, `location_id` | Adjustment lines: `theoretical_quantity`, `actual_quantity`, `quantity_difference`. |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3 or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/SivaSabariGanesan/ODOO-X-GCET-Stock-Sense.git
cd ODOO-X-GCET-Stock-Sense

# Install workspace dependencies from monorepo root
bun install
```

### 2. Configure Environment Variables

Create `.env` files in both root and `backend/`:

```bash
cp .env.example .env
cp .env.example backend/.env
```

Default development configuration (`backend/.env`):

```env
DATABASE_URL=postgresql://stocksense:stocksense_pass@localhost:5437/stocksense_db
JWT_SECRET=stocksense_dev_jwt_secret_key_2026_secure
PORT=3001
NODE_ENV=development
VITE_API_BASE_URL=http://127.0.0.1:3001
FRONTEND_URL=http://127.0.0.1:3000

# Optional: Groq AI Assistant Key
GEMINI_API_KEY=gsk_your_groq_api_key_here
AI_MODEL=llama-3.3-70b-versatile

# Transactional Email Setup
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="StockSense Security <noreply@stocksense.io>"
```

### 3. Start PostgreSQL Container

```bash
docker compose up -d
```

### 4. Run Database Migrations & Seed Dataset

```bash
# Run SQL migrations
bun --cwd backend run db:migrate

# Seed 50+ products, categories, stock balances, reorder rules & movement history
bun --cwd backend run db:seed
```

### 5. Start Development Servers

**Backend API Server** (Port `3001`):
```bash
bun --cwd backend dev
```

**Frontend React SPA** (Port `3000`):
```bash
bun --cwd frontend dev
```

---

## 📊 API Module Reference

All REST endpoints are prefixed with `/api`. Complete documentation lives in [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md).

| Module | Base Path | Key Capabilities |
|---|---|---|
| **Auth** | `/api/auth` | Register, login, email verification, 6-digit OTP reset, JWT renewal |
| **Products** | `/api/products` | Master catalog CRUD, search, categories, UOM, stock balances |
| **Categories** | `/api/categories` | Hierarchical category management |
| **Units of Measure** | `/api/uoms` | UOM CRUD (mass, volume, unit, length) |
| **Warehouses** | `/api/warehouses` | Facilities and storage location hierarchy CRUD |
| **Receipts** | `/api/receipts` | Inbound stock CRUD, item line additions, validation & processing |
| **Deliveries** | `/api/deliveries` | Outbound stock CRUD, validation & processing |
| **Transfers** | `/api/transfers` | Internal warehouse-to-warehouse transfers & execution |
| **Adjustments** | `/api/adjustments` | Stock audit corrections (count, damage, scrap) & execution |
| **Recipes (BOM)** | `/api/recipes` | Bill of Materials / finished product recipe management |
| **Stock Movements** | `/api/stock-movements` | Immutable audit ledger history & filtering |
| **Dashboard** | `/api/dashboard` | Aggregated KPI summary, stock valuation & low-stock alerts |
| **AI Assistant** | `/api/ai` | Conversational project queries, grounded tool execution & confirmation |
| **WebSockets** | `GET /ws` | Live real-time event updates via WebSocket connection |

---

## 🧪 Testing & Quality Assurance

StockSense includes **255 end-to-end integration tests** across 18 backend test files:

```bash
# Execute full backend test suite (255 tests across 18 files)
bun --cwd backend test

# Run specific module tests
bun --cwd backend test tests/inventory.test.ts
bun --cwd backend test tests/ai.test.ts
bun --cwd backend test tests/websocket.test.ts
```

| Test File | Modules Tested |
|---|---|
| `auth.test.ts` | Registration, login, JWT verification, OTP reset, email confirmation |
| `products.test.ts` | Product master CRUD, SKU uniqueness, search, barcode lookup |
| `categories.test.ts` | Category hierarchy, parent-child links, name uniqueness |
| `uoms.test.ts` | UOM CRUD, unit conversion types, deletion safeguards |
| `warehouses.test.ts` | Warehouse CRUD, short code uniqueness, facility status |
| `locations.test.ts` | Storage location hierarchy (aisle, shelf, bin), warehouse relation |
| `reorders.test.ts` | Reordering rules CRUD, threshold triggers, min/max checks |
| `stock-balances.test.ts` | Balance creation, location stock queries, stock isolation |
| `receipts.test.ts` | Receipt CRUD, line items, business validation, stock increment, idempotency |
| `deliveries.test.ts` | Delivery CRUD, line items, stock check, stock decrement, idempotency |
| `transfers.test.ts` | Transfer CRUD, origin stock check, multi-location transfer execution |
| `adjustments.test.ts` | Adjustment CRUD, count difference calculations, stock sync |
| `recipes.test.ts` | Finished product BOM recipes & ingredient item management |
| `stock-movements.test.ts` | Movement ledger audit logs, filtering by type/date/location |
| `dashboard.test.ts` | Aggregated dashboard stats, valuation math, low-stock count |
| `ai.test.ts` | AI Orchestrator intent routing, tool execution, action confirmation |
| `websocket.test.ts` | WebSocket handshake, authentication, channel subscriptions, post-commit events |
| `inventory.test.ts` | E2E inventory orchestration lifecycle: Receipt → Transfer → Delivery |

---

## 🔑 Seed Dataset Demo Credentials

After running `bun --cwd backend run db:seed`, log into StockSense with the demo account:

- **Email**: `alex.mercer@stocksense.io`
- **Password**: `StockSense2026!`
- **Role**: `admin`

---

## 📄 Documentation Links

- 📘 [API Integration Guide](docs/API_INTEGRATION.md) — Endpoint contracts, request schemas, WebSocket events, and frontend client integration code.
- 🎨 [Design System Specification](design-system/stocksense/MASTER.md) — UI design tokens, color palettes, and component guidelines.

---

## 📜 License

This project is licensed under the MIT License.
