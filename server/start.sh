#!/bin/sh
set -e

# Create uploads directory (backend fix)
mkdir -p uploads

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
node dist/index.js
