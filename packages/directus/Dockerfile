
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
# tractr/directus-sync already includes directus-sync CLI on top of Directus.
FROM tractr/directus-sync:11.16.1

# Copy only the built artifacts (package.json + dist/) — not src/ or node_modules/
RUN for dir in /directus/extensions/*/; do rm -rf "$dir"; done 2>/dev/null || true
COPY --from=builder /build/extensions/ /directus/extensions/

# ── Email templates ───────────────────────────────────────────────────────────
COPY templates/ /directus/templates/
