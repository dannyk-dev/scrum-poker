# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install system deps (openssh for Prisma migrations that use ssh git urls, etc.)
RUN apk add --no-cache openssh

# Copy package metadata first for better caching
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lockb* ./

# If you use pnpm or yarn, replace the install command accordingly
RUN npm ci

# Copy the rest of the project
COPY . .

# Generate Prisma client, run tests / lint if you like, then build Next.js
RUN npx prisma generate
RUN npm run build   # -> outputs to .next

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Railway sets PORT automatically; fall back to 3000 for local compose
ENV PORT=${PORT:-3000}

# Minimal footprint: only node_modules (production) + .next + package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# If you run migrations at container start:
# COPY --from=builder /app/node_modules/.bin/prisma /usr/local/bin/prisma
# CMD ["prisma", "migrate", "deploy", "&&", "node", "server.js"]

EXPOSE 3000
CMD ["npm", "start"]
