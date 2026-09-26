# StockSense — Enterprise Inventory Management System & AI Assistant

StockSense is a high-performance, full-stack enterprise inventory management platform designed for multi-warehouse manufacturing and logistics operations. Built on a modern **Bun + Hono + Drizzle ORM + PostgreSQL** architecture with a **React 18 + Vite** frontend, StockSense features atomic transaction processing, real-time WebSocket event streaming, grounded AI assistant integration, transactional HTML email notifications, and an immutable audit movement ledger.

---

## Key Features

- **Double-Entry Inventory Engine**: Strict stock isolation with physical stock balances managed exclusively in `stock_balances(product_id, location_id)`.
- **Atomic Operations**: Inbound Receipts, Outbound Deliveries, Internal Transfers, and Inventory Adjustments executed within single database transactions.
- **Immutable Movement Ledger**: Every stock change creates an unalterable audit record in `stock_movements`.
- **Grounded AI Assistant**: Project assistant powered by Groq LLMs (`llama-3.3-70b-versatile`) and a grounded tool execution engine for querying inventory, ledger history, and performing stock actions with user confirmation.
- **Real-Time WebSocket Layer**: Live event publishing (`ws://.../ws`) broadcast after successful DB transactions to `inventory`, `user:*`, and `role:*` channels.
- **Transactional Email System**: Responsive HTML email templates with Nodemailer transport for account verification and 6-digit OTP password resets.
- **50-Product Seed Dataset**: Comprehensive database seeder (`bun run db:seed`) populating 50+ diverse industrial products, categories, UOMs, warehouses, locations, reorder rules, and stock balances.
- **Comprehensive Test Suite**: 255 end-to-end integration tests across 18 backend modules written with Bun's native test runner (`bun test`).

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Runtime** | [Bun](https://bun.sh) v1.3+ | Fast JavaScript/TypeScript all-in-one runtime |
| **Backend API** | [Hono](https://hono.dev) v3 | Ultra-fast, lightweight web framework |
| **Frontend UI** | React 18 + Vite 5 | SPA with custom CSS Design System & Lucide Icons |
| **Database** | PostgreSQL 16 | Relational database running via Docker Compose |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) | Type-safe SQL builder and schema manager |
| **Real-Time** | WebSockets (Hono + Bun WS) | Event-driven WebSocket pub/sub layer |
| **AI Layer** | Groq API (`llama-3.3-70b`) | AI Orchestrator with grounded system tools |
| **Mail Service** | Nodemailer | Transactional HTML email rendering & delivery |
| **Validation** | Zod (Backend) + React Hook Form | Full runtime request payload validation |
| **Testing** | `bun:test` | Native execution runner for 255 integration tests |

---

## System Architecture

```text
                               ┌──────────────────────────┐
                               │   React 18 + Vite SPA    │
                               └────────────┬─────────────┘
                                            │ HTTP / REST & WebSockets
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Hono 3 REST API & WebSocket Server (Bun Runtime)                                        │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┬────────────────┤
│ Auth & Users    │ Inventory Engine │ AI Orchestrator │ Real-Time WS    │ Mail Sender    │
│ (JWT + OTP)     │ (Receipts/Move)  │ (Groq + Tools)  │ (EventBus)      │ (Nodemailer)   │
└────────┬────────┴────────┬─────────┴────────┬────────┴────────┬────────┴────────┬───────┘
         │                 │                  │                 │                 │
         ▼                 ▼                  ▼                 ▼                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ PostgreSQL 16 Database (Drizzle ORM)                                                  │
 │ 18 Tables: Users, Products, StockBalances, StockMovements, Receipts, Deliveries...   │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3 or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/SivaSabariGanesan/ODOO-X-GCET-Stock-Sense.git
cd ODOO-X-GCET-Stock-Sense

# Install monorepo workspace dependencies
bun install
```

### 2. Configure Environment Variables

Create `.env` files in both root and `backend/`:

```bash
cp .env.example .env
cp .env.example backend/.env
```

Default local development configuration (`backend/.env`):

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
# Apply SQL migrations
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

## API Module Reference

All REST endpoints are prefixed with `/api`. Documentation is maintained in [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md).

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

## Database Schema Highlights

The database consists of **18 relational tables** designed for high throughput and auditability:

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

---

## Testing & Quality Assurance

StockSense includes **255 automated end-to-end tests** covering business logic, security, concurrent transaction handling, WebSocket broadcasting, and email rendering.

```bash
# Execute full backend test suite (255 tests across 18 files)
bun --cwd backend test

# Run a specific module test
bun --cwd backend test tests/inventory.test.ts
bun --cwd backend test tests/ai.test.ts
bun --cwd backend test tests/websocket.test.ts
```

---

## Seed Dataset Demo Credentials

After executing `bun --cwd backend run db:seed`, use the admin credentials to log into StockSense:

- **Email**: `alex.mercer@stocksense.io`
- **Password**: `StockSense2026!`
- **Role**: `admin`

---

## Project Documentation

- 📘 [API Integration Guide](docs/API_INTEGRATION.md) — Complete endpoint specs, payload schemas, error codes, and frontend code snippets.
- 🎨 [Design System Specification](design-system/stocksense/MASTER.md) — UI design tokens, color palettes, and component styles.

---

## License

This project is open-source and available under the MIT License.
