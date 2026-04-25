#!/bin/bash
# Dumps all non-Directus collection data from the local wedding database,
# plus directus_files (file metadata — not the binaries).
# Outputs a plain SQL file with TRUNCATE + INSERT statements, safe to re-run.
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

# Get all non-directus tables plus directus_files (file metadata)
TABLES=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename NOT LIKE 'directus_%' OR tablename = 'directus_files') ORDER BY tablename;" \
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
} > "$OUTPUT"

echo "→ Appending collection data dump..."
pg_dump \
  -h "$HOST" \
  -p "$PORT" \
  -U "$USER" \
  -d "$DB" \
  --data-only \
  --no-owner \
  --no-acl \
  --exclude-schema=tiger \
  --exclude-schema=tiger_data \
  --exclude-schema=topology \
  --exclude-table='spatial_ref_sys' \
  --exclude-table-data='directus_*' \
  -F p >> "$OUTPUT"

echo "→ Appending directus_files dump..."
pg_dump \
  -h "$HOST" \
  -p "$PORT" \
  -U "$USER" \
  -d "$DB" \
  --data-only \
  --no-owner \
  --no-acl \
  --table='directus_files' \
  -F p >> "$OUTPUT"

echo "→ Patching directus_files storage: local → s3..."
{
  echo ""
  echo "-- Remap local storage to s3 for production"
  echo "UPDATE public.directus_files SET storage = 's3' WHERE storage = 'local';"
  echo ""
  echo "SET session_replication_role = DEFAULT;"
} >> "$OUTPUT"

echo "→ Done. $(wc -l < "$OUTPUT") lines written to $OUTPUT"
