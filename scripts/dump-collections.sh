#!/bin/bash
# Dumps all non-Directus collection data from the local wedding database.
# Outputs a plain SQL file with DELETE + INSERT statements, safe to re-run.
#
# Usage: pnpm dump:collections
# Output: .docker/docker-entrypoint.d/collections.local.sql

set -euo pipefail

HOST=localhost
PORT=5432
USER=directus
DB=wedding
OUTPUT=".docker/docker-entrypoint.d/collections.local.sql"

echo "→ Fetching table list..."

# Get all non-directus tables
TABLES=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'directus_%' ORDER BY tablename;" \
  | tr -d ' '| grep -v '^$')

echo "→ Writing TRUNCATE statement..."
{
  echo "SET session_replication_role = replica;"
  echo ""

  # Build a single TRUNCATE ... CASCADE covering all tables at once
  TABLE_LIST=$(echo "$TABLES" | tr '\n' ',' | sed 's/,$//')
  QUOTED=$(echo "$TABLE_LIST" | sed 's/,/", "/g')
  echo "TRUNCATE \"${QUOTED}\" CASCADE;"

  echo ""
  echo "SET session_replication_role = DEFAULT;"
  echo ""
} > "$OUTPUT"

echo "→ Appending data dump..."
pg_dump \
  -h "$HOST" \
  -p "$PORT" \
  -U "$USER" \
  -d "$DB" \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --exclude-table-data='directus_*' \
  -F p >> "$OUTPUT"

echo "→ Done. $(wc -l < "$OUTPUT") lines written to $OUTPUT"
