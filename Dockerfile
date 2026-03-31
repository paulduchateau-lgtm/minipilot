# ─── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# ─── Stage 2: Production server ─────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-build /build/app/dist ./app/dist

# Create data directory for SQLite persistence
RUN mkdir -p /data /app/server/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/minipilot.db
ENV UPLOADS_DIR=/app/server/uploads

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/index.js"]
