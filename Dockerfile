###############################################################################
# Build stage – install deps, run postinstall (prisma generate) + next build
###############################################################################
FROM node:20-alpine AS builder
WORKDIR /app

# ── Build‑time placeholders so env‑validation passes during `next build`
ARG AUTH_SECRET=dummy
ARG AUTH_ATLASSIAN_ID=dummy
ARG AUTH_ATLASSIAN_SECRET=dummy
ARG ATLASSIAN_API_TOKEN=dummy
ARG DATABASE_URL=mysql://root:root@localhost:3306/dummy
ARG REDIS_URL=redis://:root@localhost:6379/0

ENV AUTH_SECRET=$AUTH_SECRET \
    AUTH_ATLASSIAN_ID=$AUTH_ATLASSIAN_ID \
    AUTH_ATLASSIAN_SECRET=$AUTH_ATLASSIAN_SECRET \
    ATLASSIAN_API_TOKEN=$ATLASSIAN_API_TOKEN \
    DATABASE_URL=$DATABASE_URL \
    REDIS_URL=$REDIS_URL

# System deps (optional, remove if unused)
RUN apk add --no-cache openssh

# 1. Copy lockfiles first -> better cache
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lockb* ./

# 2. Copy Prisma schema before install so postinstall succeeds
RUN mkdir -p prisma
COPY prisma/schema.prisma prisma/schema.prisma

# 3. Install deps (postinstall runs prisma generate)
RUN npm ci --legacy-peer-deps

# 4. Copy the rest of the project and build
COPY . .
RUN npm run build          # outputs .next

###############################################################################
# Runtime stage – smallest possible image
###############################################################################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${PORT:-3000}

# Copy runtime assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json  ./
COPY --from=builder /app/.next         ./.next
COPY --from=builder /app/public        ./public
COPY --from=builder /app/prisma        ./prisma

# ── Entrypoint: run pending migrations, then start Next.js
COPY <<'SH' /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e
# Apply any new migrations (no generation, just SQL)
npx prisma migrate deploy
exec npm start        # "next start -p $PORT"
SH
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
