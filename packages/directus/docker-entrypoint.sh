#!/bin/sh
set -e

mkdir -p /directus/transfer && chown node:node /directus/transfer

# Start Directus in the background
node /directus/cli.js start &
DIRECTUS_PID=$!

# Wait for Directus to be healthy
echo "[entrypoint] Waiting for Directus to be ready..."
until wget -qO- http://0.0.0.0:8055/server/health > /dev/null 2>&1; do
  sleep 2
done

# Push synced config (flows, roles, permissions, settings)
echo "[entrypoint] Running directus-sync pull..."
directus-sync pull --config-path /directus/directus-sync.config.cjs

echo "[entrypoint] Sync complete."
wait $DIRECTUS_PID
