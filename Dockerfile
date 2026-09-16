# ╔══════════════════════════════════════════════════════════════╗
# ║  Optical Fiber File Transfer System — Multi-Stage Docker   ║
# ╚══════════════════════════════════════════════════════════════╝

# ─── Stage 1: Build the Vite React Frontend ─────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files first for caching
COPY package.json package-lock.json ./

# Copy all workspace package.json files
COPY packages/shared/package.json packages/shared/
COPY packages/crypto/package.json packages/crypto/
COPY packages/protocol/package.json packages/protocol/
COPY packages/transport/package.json packages/transport/
COPY packages/transfer-engine/package.json packages/transfer-engine/
COPY apps/desktop/package.json apps/desktop/
COPY apps/cli/package.json apps/cli/

# Install all dependencies (uses npm workspaces)
RUN npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

# Copy all source files
COPY packages/ packages/
COPY apps/ apps/
COPY tsconfig.base.json ./

# Build the Vite frontend
RUN cd apps/desktop && npx vite build

# ─── Stage 2: Production Runtime ────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/shared/package.json packages/shared/
COPY packages/crypto/package.json packages/crypto/
COPY packages/protocol/package.json packages/protocol/
COPY packages/transport/package.json packages/transport/
COPY packages/transfer-engine/package.json packages/transfer-engine/
COPY apps/desktop/package.json apps/desktop/
COPY apps/cli/package.json apps/cli/

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy workspace source packages (needed at runtime for the relay + protocol)
COPY packages/ packages/
COPY apps/cli/ apps/cli/

# Copy the relay server
COPY apps/desktop/relay-server.js apps/desktop/

# Copy the built frontend from builder stage
COPY --from=builder /app/apps/desktop/dist apps/desktop/dist

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the relay server
CMD ["node", "apps/desktop/relay-server.js"]
