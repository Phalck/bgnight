#!/bin/bash
# Build script for Vercel deployment

# Check if DATABASE_URL is set and contains postgresql
if [[ -n "$DATABASE_URL" && "$DATABASE_URL" == *"postgresql"* ]]; then
  echo "Detected PostgreSQL database, running migrations..."
  npx prisma db push --accept-data-loss
else
  echo "Warning: DATABASE_URL not set or not PostgreSQL. Skipping database setup."
fi

# Build the Next.js app
next build
