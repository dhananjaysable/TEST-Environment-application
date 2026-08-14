# Multi-Stage Production Dockerfile (Build Once, Deploy Everywhere)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root enterprise security user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# Install only production dependencies
RUN npm ci --omit=dev && chown -R appuser:nodejs /app

USER appuser

EXPOSE 8080

CMD ["node", "src/server.js"]
