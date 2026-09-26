#!/bin/bash
# Build script for Vercel deployment
#
# Deliberately does NOT touch the database. It used to run
# `prisma db push --accept-data-loss`, which would silently drop data on the production
# database the moment a schema change removed or narrowed a column. Apply schema changes by
# hand, against the database you mean, before deploying the code that needs them:
#   DATABASE_URL=... npx prisma db push      (prompts before anything destructive)

next build
