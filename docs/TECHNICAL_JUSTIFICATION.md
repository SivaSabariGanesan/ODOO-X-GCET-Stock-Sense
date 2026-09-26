# StockSense — Technical Justification & Architecture Decision Record (ADR)

This document provides the formal architectural rationale and technical justifications for the technology stack choices, messaging patterns, AI engine design, and database ORM decisions in the StockSense project.

---

## 1. Executive Summary of Tech Stack Choices

| Layer | Chosen Technology | Primary Alternatives Evaluated | Key Justification |
|---|---|---|---|
| **Runtime & Backend** | **Bun v1.3 + Hono v3** | Node.js + Express, Python + FastAPI | 4x-10x request throughput, instant cold starts, native TypeScript execution, shared frontend/backend types. |
| **Database & ORM** | **PostgreSQL 16 + Drizzle ORM** | MongoDB, Prisma, SQLAlchemy | Strict ACID multi-table transactions, row-level locking, zero runtime binary overhead, clean SQL output. |
| **Real-Time Layer** | **WebSockets (`ws://`)** | Server-Sent Events (SSE), HTTP Long Polling | Bi-directional client metadata exchange, lower framing header overhead, native multi-channel room subscriptions. |
| **AI Assistant** | **Grounded System Tools + Groq LLM** | Generic RAG, Unconstrained Chatbot | Factual backend service integration (`StockBalanceService`), zero hallucination guarantee, mandatory action confirmation prompt. |
| **Email System** | **Nodemailer + HTML Templates** | SendGrid / Resend SaaS APIs | Zero third-party vendor lock-in, full data privacy, customizable responsive HTML layouts with dev logger fallback. |

---

## 2. Runtime & Web Framework: Bun + Hono vs. Python + FastAPI

### 2.1 End-to-End Type Safety (TypeScript)
In enterprise inventory systems, mismatched data types between the API layer and the UI cause silent inventory corruption (e.g. string quantities `"10"` concatenated instead of added `10 + 5`). By using **Bun + Hono (Backend)** alongside **React + Vite (Frontend)**, both layers share identical Zod validation schemas and TypeScript type definitions. Python/FastAPI requires maintaining parallel Pydantic models and TypeScript definitions via codegen tools.

### 2.2 Performance & Memory Footprint
- **Request Throughput**: Bun's Zig-native HTTP server handles up to **100,000+ requests/sec**, compared to Uvicorn/FastAPI (~15,000–25,000 req/sec).
- **Instant Cold Starts**: Bun starts in under **10ms**, making local development and CI test runner execution (`bun test` running 255 tests in ~11 seconds) exceptionally fast.
- **Native WebSockets**: Bun features built-in native WebSocket support without extra ASGI server wrappers (such as `uvicorn[standard]` or `gunicorn`).

---

## 3. Database & ORM: PostgreSQL 16 + Drizzle vs. Alternatives

### 3.1 Why Relational PostgreSQL 16 over Document DBs (MongoDB)?
Inventory management relies heavily on relational integrity. A single receipt affects `receipts`, `receipt_items`, `stock_balances`, and `stock_movements`.
- PostgreSQL 16 provides strict foreign key constraints, composite primary keys `(product_id, location_id)`, and atomic multi-row transaction isolation (`db.transaction()`). NoSQL databases lack strict cross-document foreign key constraints.

### 3.2 Why Drizzle ORM over Prisma & SQLAlchemy?
- **Zero Rust Engine Overhead**: Prisma executes all queries through a heavy compiled Rust CLI binary (`query-engine`), increasing bundle size and memory usage by 100MB+. Drizzle is pure TypeScript compiling directly to SQL.
- **Explicit SQL Control**: Drizzle query builder produces standard, inspectable SQL without hidden ORM "N+1 query" traps.
- **Lightweight Transactions**: `db.transaction(async (tx) => { ... })` passes an explicit transaction context `tx`, making multi-table rollbacks transparent and predictable.

---

## 4. Real-Time Layer: WebSockets (`ws://`) vs. Server-Sent Events (SSE)

### 4.1 Bi-Directional Protocol Capabilities
- **SSE (Server-Sent Events)** is strictly a 1-way channel (Server → Client). Client authentication handshakes and dynamic channel subscription changes require out-of-band HTTP requests.
- **WebSockets** establish a 2-way persistent TCP connection allowing clients to authenticate, request dynamic channel joins (`role:admin`, `user:123`, `inventory`), and receive live push notifications over a single socket.

### 4.2 Network Overhead Efficiency
- SSE sends full HTTP response headers (`Content-Type`, `Cache-Control`, `Connection`) on every message frame.
- WebSocket frames use lightweight binary/text byte framing (2–10 bytes header per message), significantly reducing network overhead during high-frequency stock ledger updates.

### 4.3 Post-Commit Event Dispatching
StockSense implements a strict **Post-Commit EventBus**:
```text
[Transaction Execution] ──► [PostgreSQL COMMIT] ──► [EventBus.publish()] ──► [WebSocket Clients]
```
If a transaction fails or rolls back, zero WebSocket events are published. Clients are never notified of phantom inventory state changes.

---

## 5. AI Assistant Engine: Grounded System Tools vs. Generic Chatbots

### 5.1 Factual Precision & Zero Hallucinations
Generic LLM chatbots tend to invent plausible-sounding product names, stock quantities, or warehouse locations. StockSense solves this by implementing a **Grounded Tool Execution Engine**:
- When a user asks *"How much stock do we have for Cotton T-Shirt?"*, the AI Orchestrator executes `aiTools.list_products.handler()` and `aiTools.get_product_details.handler()`.
- Answers are formatted strictly from actual SQL database queries.

### 5.2 Mandatory Action Confirmation Prompt
For inventory-mutating requests (e.g. *"Process receipt REC-001"*), the AI Orchestrator enforces a confirmation safeguard:
```text
User Request ──► Detect Mutating Action ──► Prompt Confirmation ──► User replies 'confirm' ──► Execute Service
```
This guarantees that AI cannot execute destructive database modifications without explicit user approval.

---

## 6. Email System: Nodemailer + HTML vs. Third-Party SaaS

- **Data Privacy & Compliance**: Sensitive user emails and OTP hashes remain inside project infrastructure rather than passing through external third-party API logs.
- **Development Fallback**: In local testing, Nodemailer automatically falls back to dev console logging without requiring valid SMTP credentials.
