# top of Dockerfile – before the builder stage
ARG AUTH_SECRET=dummy
ARG AUTH_ATLASSIAN_ID=dummy
ARG AUTH_ATLASSIAN_SECRET=dummy
ARG ATLASSIAN_API_TOKEN=dummy
ARG DATABASE_URL=mysql://root:root@localhost:3306/dummy
ARG REDIS_URL=redis://:root@localhost:6379/0

###############################################################################
#                       ─── Build (Stage 1) ─────────────────                 #
###############################################################################
FROM node:20-alpine AS builder
WORKDIR /app

ENV AUTH_SECRET          $AUTH_SECRET
ENV AUTH_ATLASSIAN_ID    $AUTH_ATLASSIAN_ID
ENV AUTH_ATLASSIAN_SECRET $AUTH_ATLASSIAN_SECRET
ENV ATLASSIAN_API_TOKEN  $ATLASSIAN_API_TOKEN
ENV DATABASE_URL         $DATABASE_URL
ENV REDIS_URL            $REDIS_URL

RUN apk add --no-cache openssh

# 1) Copy lockfiles *first*
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lockb* ./

# 2) Make sure prisma folder exists, then copy schema
RUN mkdir prisma        # avoids “/ # not found” edge case
COPY prisma/schema.prisma ./prisma/schema.prisma

# 3) Install deps (postinstall will find schema)
RUN npm ci --legacy-peer-deps

# 4) Copy the rest of the source
COPY . .

# 5) Build
RUN npm run build        # Prisma client already generated

###############################################################################
#                      ─── Runtime (Stage 2) ─────────────────                #
###############################################################################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${PORT:-3000}

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json  ./
COPY --from=builder /app/.next         ./.next
COPY --from=builder /app/public        ./public
COPY --from=builder /app/prisma        ./prisma

EXPOSE 3000
CMD ["npm", "start"]
