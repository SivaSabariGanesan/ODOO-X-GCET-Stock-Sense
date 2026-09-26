# ---------------------------------------------------------------------------
# Stage 1: Build static frontend assets
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package.json bun.lock* ./

# Install frontend dependencies
RUN bun install --frozen-lockfile || bun install

# Copy frontend source code
COPY . .

# Build production static bundle
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2: Serve static build via Nginx Alpine
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Copy built static assets to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
