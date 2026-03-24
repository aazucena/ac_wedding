#!/bin/sh
set -e

mkdir -p /directus/transfer && chown node:node /directus/transfer

# Start Directus in the background
node /directus/cli.js start &
DIRECTUS_PID=$!

# Wait for Directus to be healthy
echo "[entrypoint] Waiting for Directus to be ready..."
sleep 5
until wget -qO- http://127.0.0.1:8055/server/health > /dev/null 2>&1; do
  sleep 2
done

# Pull synced config (flows, roles, permissions, settings)
echo "[entrypoint] Running directus-sync pull..."
PUBLIC_URL=http://127.0.0.1:8055 directus-sync pull --config-path /directus/directus-sync.config.cjs

echo "[entrypoint] Sync complete."
wait $DIRECTUS_PID
