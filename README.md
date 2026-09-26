# StockSense — Inventory Management System

StockSense is a full-stack inventory management system built for multi-warehouse operations. It covers inbound receipts, outbound deliveries, internal transfers, stock adjustments, real-time stock movement ledger, and a live dashboard — all backed by a PostgreSQL database with a typed Hono REST API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) v1.3+ |
| Frontend | React 18 + Vite 5 + Vanilla CSS |
| Backend | Hono 3 (on Bun) |
| Database | PostgreSQL 16 (via Docker) |
| ORM | Drizzle ORM |
| Validation | Zod (backend) + React Hook Form (frontend) |
| Icons | Lucide React |
| Testing | `bun:test` (built-in) |

> **Note:** `drizzle-kit generate:pg` has a known ESM resolution bug in this project.
> Use hand-written migration files in `backend/src/db/migrations/` and apply them with `bun --cwd backend run db:migrate`.

---

## Project Structure

```
.
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── api/                # (reserved) shared API client instances
│       ├── app/                # App shell, router, providers
│       ├── components/         # Shared UI components (Button, Badge, Input, …)
│       ├── context/            # React contexts (Toast, Auth)
│       ├── features/           # Feature modules — each owns pages, hooks, api, types
│       │   ├── auth/           # Login, signup, OTP, password reset
│       │   ├── dashboard/      # KPI cards, low stock, pending operations
│       │   ├── products/       # Product catalog
│       │   ├── receipts/       # Inbound receipts ← API integrated
│       │   ├── deliveries/     # Outbound deliveries ← API integrated
│       │   ├── transfers/      # Internal transfers (mock)
│       │   ├── adjustments/    # Inventory adjustments ← API integrated
│       │   └── moves/          # Stock movement history (mock)
│       ├── hooks/              # Shared custom hooks
│       ├── lib/
│       │   ├── apiClient.ts    # Base fetch wrapper (Bearer token, ApiError)
│       │   └── cn.ts           # clsx utility
│       ├── schemas/            # Zod validation schemas
│       ├── styles/             # Global CSS
│       └── types/              # Shared TypeScript types
│
├── backend/                    # Hono API server (Bun)
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/         # App configuration (JWT, SMTP, ports)
│   │   │   ├── middleware/     # Auth (JWT), error handler, CORS
│   │   │   └── routes/         # Central route registration
│   │   ├── db/
│   │   │   ├── client.ts       # Drizzle instance + postgres-js pool
│   │   │   ├── migrate.ts      # Migration runner script
│   │   │   ├── migrations/     # Hand-written SQL migrations (tracked in _migrations)
│   │   │   └── schema/         # Drizzle table definitions (one file per table)
│   │   ├── lib/                # Shared backend utilities (errors, etc.)
│   │   ├── modules/            # Feature modules
│   │   │   ├── auth/           # Register, login, OTP, JWT
│   │   │   ├── receipts/       # Full CRUD + validate + process
│   │   │   ├── deliveries/     # Full CRUD + validate + process
│   │   │   ├── transfers/      # Full CRUD + validate + execute
│   │   │   ├── adjustments/    # Full CRUD + apply
│   │   │   ├── inventory/      # Stock balance queries
│   │   │   ├── products/       # Product catalog
│   │   │   ├── warehouses/     # Warehouse + location management
│   │   │   ├── stock-movements/# Movement ledger
│   │   │   └── dashboard/      # Aggregated stats endpoint
│   │   ├── server/             # Hono app entry point
│   │   └── websocket/          # WebSocket handlers (real-time updates)
│   └── tests/                  # bun:test integration tests (per module)
│
├── design-system/
│   └── stocksense/
│       ├── MASTER.md           # Design system specification
│       └── pages/              # Per-page design overrides
│
├── docs/
│   ├── api/                    # API documentation
│   └── architecture/           # Architecture decision records
│
├── docker/
│   └── postgres/               # PostgreSQL Docker config & init scripts
│
├── docker-compose.yml
├── .env.example                # Environment variable template
├── package.json                # Monorepo root (Bun workspaces)
└── bun.lock
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd ODOO-X-GCET-Stock-Sense

# Install all workspace dependencies from the monorepo root
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
cp .env.example backend/.env
```

Edit `backend/.env` with your values. The defaults match the Docker Compose config and work out of the box for local development:

```env
DATABASE_URL=postgresql://stocksense:stocksense_pass@localhost:5432/stocksense_db
JWT_SECRET=change_me_in_production
PORT=3000
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
bun --cwd backend run db:migrate
```

This applies all pending SQL files from `backend/src/db/migrations/` in filename order and tracks them in a `_migrations` table.

> ⚠️ `drizzle-kit generate:pg` has a known ESM resolution bug. When you change a Drizzle schema file, write the migration SQL by hand, save it as the next numbered file (e.g. `0008_your_change.sql`), and re-run `db:migrate`.

### 5. Start the development servers

**Backend** (port 3000):
```bash
bun --cwd backend dev
```

**Frontend** (port 5173):
```bash
bun --cwd frontend dev
```

Or from the monorepo root:
```bash
bun run dev:backend   # terminal 1
bun run dev:frontend  # terminal 2
```

---

## API Overview

All endpoints are prefixed with `/api`. Authentication uses **Bearer JWT tokens** sent in the `Authorization` header.

| Module | Prefix | Key Endpoints |
|---|---|---|
| Auth | `/api/auth` | `POST /register`, `POST /login`, `POST /logout` |
| Receipts | `/api/receipts` | CRUD + `POST /:id/validate` + `POST /:id/process` + `POST /:id/cancel` |
| Deliveries | `/api/deliveries` | CRUD + `POST /:id/validate` + `POST /:id/process` + `POST /:id/cancel` |
| Transfers | `/api/transfers` | CRUD + `POST /:id/validate` + `POST /:id/execute` + `POST /:id/cancel` |
| Adjustments | `/api/adjustments` | CRUD + `POST /:id/apply` + `POST /:id/cancel` |
| Products | `/api/products` | CRUD + stock balance per product |
| Warehouses | `/api/warehouses` | CRUD + nested locations |
| Stock Movements | `/api/stock-movements` | Read-only ledger, filterable |
| Dashboard | `/api/dashboard` | Aggregated KPIs, low-stock alerts |

---

## Database

### Schema — 16 tables

| Table | Description |
|---|---|
| `users` | Authentication and user management |
| `password_reset_otps` | Hashed OTPs for password reset |
| `categories` | Product categories |
| `units_of_measure` | UoM definitions (kg, pcs, litre, …) |
| `products` | Product master — SKU, name, category, UoM |
| `warehouses` | Physical warehouse facilities |
| `locations` | Hierarchical locations within warehouses |
| `reorder_rules` | Min/max/reorder qty per product+location |
| `stock_balances` | Current stock per product+location (source of truth) |
| `stock_movements` | Immutable ledger of every stock change |
| `receipts` | Inbound receipt documents |
| `receipt_items` | Line items per receipt |
| `deliveries` | Outbound delivery documents |
| `delivery_items` | Line items per delivery |
| `internal_transfers` | Warehouse-to-warehouse transfer documents |
| `internal_transfer_items` | Line items per transfer |
| `inventory_adjustments` | Stock correction documents |
| `inventory_adjustment_items` | Line items per adjustment |

> Stock quantity lives exclusively in `stock_balances(product_id, location_id)` — never on the product row itself.

### Migrations

```bash
# Apply all pending migrations
bun --cwd backend run db:migrate

# Open Drizzle Studio (visual DB browser, dev only)
bun --cwd backend run db:studio
```

**To add a new migration:**
1. Write your SQL change (e.g. `0008_add_my_column.sql`)
2. Save it in `backend/src/db/migrations/`
3. Run `bun --cwd backend run db:migrate`

The runner picks up files alphabetically and skips already-applied ones.

### Docker commands

```bash
docker compose up -d          # Start PostgreSQL
docker compose ps             # Check container status
docker compose logs postgres  # View DB logs
docker compose down           # Stop
docker compose down -v        # Stop + wipe data volume (destructive)
```

---

## Testing

Tests use `bun:test` (built-in, no extra dependencies). Each backend module has its own integration test file under `backend/tests/`.

```bash
# Run all tests
bun --cwd backend test

# Run a specific test file
bun --cwd backend test tests/receipts.test.ts

# Run with extended timeout (for slow DB operations)
bun --cwd backend test --timeout 60000
```

**Test coverage per module:**

| File | Scenarios |
|---|---|
| `auth.test.ts` | Register, login, JWT verification, OTP flow |
| `receipts.test.ts` | CRUD, item management, validate, process, cancel, idempotency, concurrency |
| `deliveries.test.ts` | CRUD, item management, validate, process, cancel |
| `transfers.test.ts` | CRUD, item management, validate, execute, cancel |
| `adjustments.test.ts` | CRUD, item management, apply, cancel |
| `products.test.ts` | CRUD, stock balance queries |
| `stock-movements.test.ts` | Ledger read, filters |

> Tests create isolated fixtures (unique timestamps in names) and clean up after themselves in `afterAll`.

---

## Frontend API Integration Status

| Feature | Status |
|---|---|
| Receipts | ✅ Fully integrated (`api.ts`, `useReceipts`, `useReceipt`) |
| Deliveries | ✅ Fully integrated (`api.ts`, `useDeliveries`, `useDelivery`) |
| Transfers | 🔲 Mock data |
| Adjustments | ✅ Fully integrated (`api.ts`, `useAdjustments`, `useAdjustment`) |
| Products | 🔲 Mock data |
| Dashboard | 🔲 Mock data |
| Auth | 🔲 Mock (localStorage) |

The API client base (`src/lib/apiClient.ts`) handles Bearer token injection, typed `ApiError`, and all HTTP methods. Each feature module will get its own `api.ts` + `hooks/` alongside the existing pages.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | see `.env.example` |
| `POSTGRES_DB` | Database name | `stocksense_db` |
| `POSTGRES_USER` | Database user | `stocksense` |
| `POSTGRES_PASSWORD` | Database password | `stocksense_pass` |
| `POSTGRES_PORT` | Exposed host port | `5432` |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Secret for JWT signing | — (required) |
| `VITE_API_BASE_URL` | Frontend → backend URL | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username / email | — |
| `SMTP_PASS` | SMTP password / app password | — |
| `SMTP_FROM` | From address for outgoing mail | — |

---

## Design System

The UI follows a custom design language (not Tailwind). See [`design-system/stocksense/MASTER.md`](design-system/stocksense/MASTER.md) for the full specification: color tokens, typography, spacing, component specs, and anti-patterns.

Per-page overrides live in `design-system/stocksense/pages/`. If a page file exists, its rules take precedence over the master spec.
