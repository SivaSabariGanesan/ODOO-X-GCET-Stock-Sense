# ---------------------------------------------------------------------------
# Stage 1: Build dependencies & production bundle
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy backend source code
COPY . .

# Build bundled production JavaScript executable
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2: Production Runtime Image
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built artifacts and necessary runtime scripts
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY --from=builder /app/src/db/migrate.ts ./src/db/migrate.ts

# Set non-root runtime security user
USER bun

EXPOSE 3001

# Container healthcheck using liveness endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

# Default execution command
CMD ["bun", "run", "dist/index.js"]
