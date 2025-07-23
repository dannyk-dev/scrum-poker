#!/bin/sh
set -e
# Run pending migrations (no codegen) if any
npx prisma migrate deploy
# now start Next.js
exec npm start
