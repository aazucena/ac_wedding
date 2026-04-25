
# ── Stage 1: Build extensions ─────────────────────────────────────────────────
# Use a full Node image where npm is available to install deps and build.
FROM node:20-alpine AS builder

WORKDIR /build
COPY extensions/ ./extensions/

RUN for dir in extensions/*/; do \
      [ -f "$dir/package.json" ] || continue; \
      echo "→ Installing $dir"; \
      npm install --prefix "$dir"; \
      echo "→ Building $dir"; \
      npm run build --prefix "$dir"; \
    done

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM tractr/directus-sync:11.17.1

USER root
RUN npm install -g directus-sync
USER node

# Copy only the built artifacts (package.json + dist/) — not src/ or node_modules/
RUN for dir in /directus/extensions/*/; do rm -rf "$dir"; done 2>/dev/null || true
COPY --chown=node:node --from=builder /build/extensions/ /directus/extensions/

# ── Email templates ───────────────────────────────────────────────────────────
COPY --chown=node:node templates/ /directus/templates/

# ── directus-sync ─────────────────────────────────────────────────────────────
COPY --chown=node:node sync/ /directus/sync/
COPY --chown=node:node directus-sync.config.cjs /directus/directus-sync.config.cjs
COPY --chown=node:node directus-transfer.config.cjs /directus/directus-transfer.config.cjs

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY --chmod=755 docker-entrypoint.sh /directus/docker-entrypoint.sh
ENTRYPOINT ["/directus/docker-entrypoint.sh"]
