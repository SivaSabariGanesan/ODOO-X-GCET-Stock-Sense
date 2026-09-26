# StockSense — Inventory Management System

StockSense is an inventory management dashboard built on top of the Odoo ecosystem. It provides multi-warehouse stock tracking, product management, reorder rules, and real-time inventory operations through a clean, Odoo-native UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) v1.3+ |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Hono 3 (on Bun) |
| Database | PostgreSQL 16 (via Docker) |
| ORM | Drizzle ORM + drizzle-kit |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query v5 |
| Icons | Lucide React |

---

## Project Structure

```
.
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── api/                # API client functions
│       ├── app/                # App shell, router, providers
│       ├── components/         # Shared UI components
│       ├── features/           # Feature modules (products, warehouses, etc.)
│       ├── hooks/              # Shared custom hooks
│       ├── lib/                # Utilities, helpers
│       ├── schemas/            # Zod validation schemas
│       ├── styles/             # Global CSS, Tailwind base
│       └── types/              # Shared TypeScript types
│
├── backend/                    # Hono API server (Bun)
│   └── src/
│       ├── app/
│       │   ├── config/         # App configuration
│       │   ├── middleware/     # Auth, error handling, CORS
│       │   └── routes/         # Route registration
│       ├── db/
│       │   ├── client.ts       # Drizzle instance + postgres-js pool
│       │   ├── index.ts        # DB layer public export
│       │   ├── migrate.ts      # Migration runner script
│       │   ├── migrations/     # Hand-written SQL migrations
│       │   └── schema/         # Drizzle table definitions (one file per table)
│       ├── lib/                # Shared backend utilities
│       ├── modules/            # Feature modules (auth, products, warehouses, …)
│       │   └── <module>/
│       │       ├── route.ts    # Hono route handlers
│       │       ├── schema.ts   # Zod request/response schemas
│       │       ├── service.ts  # Business logic
│       │       └── types.ts    # TypeScript types
│       ├── server/             # Server entry point
│       └── websocket/          # WebSocket handlers
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
│   └── postgres/               # PostgreSQL Docker config
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

# Install all workspace dependencies from the root
bun install
```

### 2. Configure environment variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and set your values. The defaults match the Docker Compose config and work out of the box for local development:

```env
DATABASE_URL=postgresql://stocksense:stocksense_pass@localhost:5432/stocksense_db
JWT_SECRET=your_jwt_secret_here
PORT=3000
NODE_ENV=development
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
bun --cwd backend run db:migrate
```

This applies all pending SQL migrations from `backend/src/db/migrations/` and tracks them in a `_migrations` table.

### 5. Start the development servers

**Backend** (port 3000):
```bash
bun --cwd backend dev
```

**Frontend** (port 5173):
```bash
bun --cwd frontend dev
```

Or run both from the root:
```bash
bun run dev:backend   # terminal 1
bun run dev:frontend  # terminal 2
```

---

## Database

### Schema (Person 1 domain)

The foundation schema covers 9 tables:

| Table | Description |
|---|---|
| `users` | Authentication and user management |
| `password_reset_otps` | Hashed OTPs for password reset (never raw) |
| `categories` | Product categories |
| `units_of_measure` | UoM definitions (kg, pcs, litre, …) |
| `products` | Product master — SKU, name, category, UoM |
| `warehouses` | Physical warehouse facilities |
| `locations` | Hierarchical locations within warehouses |
| `reorder_rules` | Min/max/reorder qty per product+location |
| `stock_balances` | Current stock per product+location (source of truth) |

Stock quantity lives exclusively in `stock_balances(product_id, location_id)` — never on the product row itself.

### Useful DB commands

```bash
# Apply pending migrations
bun --cwd backend run db:migrate

# Generate migration SQL from Drizzle schema changes
bun --cwd backend run db:generate

# Push schema directly to DB (dev only, skips migration files)
bun --cwd backend run db:push

# Open Drizzle Studio (visual DB browser)
bun --cwd backend run db:studio
```

### Docker commands

```bash
# Start PostgreSQL
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs postgres

# Stop
docker compose down

# Stop and wipe the data volume (destructive)
docker compose down -v
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | see `.env.example` |
| `POSTGRES_DB` | Database name | `stocksense_db` |
| `POSTGRES_USER` | Database user | `stocksense` |
| `POSTGRES_PASSWORD` | Database password | `stocksense_pass` |
| `POSTGRES_PORT` | Exposed port | `5432` |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Secret for JWT signing | — |

---

## Design System

The UI follows an Odoo-native design language. See [`design-system/stocksense/MASTER.md`](design-system/stocksense/MASTER.md) for the full specification: color tokens, typography, spacing, component specs, and anti-patterns.

Per-page overrides live in `design-system/stocksense/pages/`. If a page file exists, its rules take precedence over the master spec.
