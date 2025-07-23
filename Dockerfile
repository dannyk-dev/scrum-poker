###############################################################################
#                       ─── Build (Stage 1) ─────────────────                 #
###############################################################################
FROM node:20-alpine AS builder

WORKDIR /app

# Optional: for prisma migrations via SSH git urls, etc.
RUN apk add --no-cache openssh

# ── 1.  Copy dependency manifests *and* Prisma schema first
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lockb* ./
COPY prisma ./prisma                       #  <- schema.prisma is now present

# ── 2.  Install dependencies (postinstall → prisma generate succeeds)
RUN npm ci --legacy-peer-deps

# ── 3.  Copy the rest of your source
COPY . .

# ── 4.  Build
RUN npm run build        #   ↳ outputs .next/
# Prisma client was already generated during npm ci

###############################################################################
#                      ─── Runtime (Stage 2) ─────────────────                #
###############################################################################
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
# Railway injects PORT; default to 3000 for local compose
ENV PORT=${PORT:-3000}

# ── 5.  Bring only what we need
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json  ./
COPY --from=builder /app/.next         ./.next
COPY --from=builder /app/public        ./public
COPY --from=builder /app/prisma        ./prisma

# If you run migrations at container start, uncomment:
# COPY --from=builder /app/node_modules/.bin/prisma /usr/local/bin/prisma
# CMD ["sh", "-c", "prisma migrate deploy && npm start"]

EXPOSE 3000
CMD ["npm", "start"]        # next start -p $PORT (set in package.json)
