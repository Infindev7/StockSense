# ==========================================
# StockSense Client Dockerfile (Multi-stage)
# ==========================================

# Stage 1: Build React static assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests to leverage build caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Minimal runtime image using Nginx Alpine
FROM nginx:1.27-alpine AS runner

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration with SPA fallback and API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
