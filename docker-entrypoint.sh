#!/bin/sh
set -e

# Run database migrations if DATABASE_URL is provided
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
fi

# Execute the main container command
exec "$@"