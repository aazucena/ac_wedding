# Production Migration Guide

Steps to migrate local data and schema changes to the production Railway environment.

> **Always run these steps in order.** Each step depends on the previous one succeeding.

---

## Prerequisites

- Local Directus stack running (`pnpm directus:start`)
- Railway CLI authenticated (`railway login`)
- AWS CLI configured with access to the Railway S3 bucket
- `TRANSFER_URL` and `TRANSFER_TOKEN` set in your local environment (production Directus admin token)

---

## Step 1 — Backup Production Database

Before touching anything, take a full PostgreSQL dump of the production database via Railway.

```bash
railway connect postgres
# Inside the Railway shell:
pg_dump $DATABASE_URL --no-acl --no-owner -F c -f backup-$(date +%Y%m%d).dump
```

Or use the Railway dashboard: **PostgreSQL service → Backups → Create backup**.

Keep this backup somewhere safe before proceeding.

---

## Step 2 — Dump Local Collection Data

Export the current local collection data (guests, parties, vendors, etc.) to a SQL file. This excludes all Directus system tables.

```bash
pnpm dump:collections
# Output: .docker/docker-entrypoint.d/collections.local.sql
```

Review the output file before proceeding to confirm it contains the expected data.

---

## Step 3 — Push Upload Files to S3

Sync local Directus uploads to the Railway S3 bucket so that assets (images, documents) are available in production.

```bash
aws s3 sync .docker/data/uploads/ s3://<railway-bucket-name>/uploads/ \
  --endpoint-url <railway-s3-endpoint>
```

Replace `<railway-bucket-name>` and `<railway-s3-endpoint>` with your Railway object storage values (found under **Variables** on the storage service).

---

## Step 4 — Push Directus Sync to Production

Push schema, flows, permissions, and settings from local to production using `directus-sync`.

```bash
pnpm sync:push:prod
```

This uses `packages/directus/directus-transfer.config.cjs` and requires `TRANSFER_URL` and `TRANSFER_TOKEN` to be set in your environment.

> Verify the push completed without errors before moving to the next step. The Directus admin panel on production should reflect the updated schema and flows.

---

## Step 5 — Apply Collection Data to Production

Run the SQL dump from Step 2 against the production PostgreSQL database.

```bash
railway connect postgres
# Inside the Railway shell:
psql $DATABASE_URL < .docker/docker-entrypoint.d/collections.local.sql
```

The dump script uses `TRUNCATE ... CASCADE` followed by re-inserts, so it is safe to re-run if needed.

---

## Post-Migration Checklist

- [ ] Verify guest RSVP links work at `https://wedding.aazucena.com/rsvp/<token>`
- [ ] Confirm Directus admin panel at `https://planner.aazucena.com` shows correct data
- [ ] Check flows are active (Settings → Flows)
- [ ] Test at least one email flow (e.g. trigger a test invitation from the admin panel)
- [ ] Confirm uploaded assets are accessible in the production media library
