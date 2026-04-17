# Multi-stage build for Basketball Stats Tracker
# Optimized for Google Cloud Platform deployment

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source and build frontend + server
COPY . .
RUN npm run build:all

# Stage 2: Production stage
FROM node:22-alpine AS production

WORKDIR /app

# curl for HEALTHCHECK
RUN apk add --no-cache curl

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Direct node invocation for faster cold starts on Cloud Run
CMD ["node", "dist-server/api/server.js"]
