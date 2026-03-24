# Catholic Wedding Planner
**Aldrin & Christine — September 26, 2026**

A self-hosted wedding management system built on [Directus](https://directus.io), PostgreSQL, and Astro. Manages everything from guest RSVPs and entourage lineups to Parish music approval and canonical marriage requirements — all in one place.

---

## Deployment

| Service | Platform | Domain |
|---|---|---|
| Directus CMS | Railway | `planner.aazucena.com` |
| Database | Railway PostgreSQL (built-in plugin) | — |
| RSVP / Wedding Site | Vercel (Astro 6 SSR) | `wedding.aazucena.com` |
| Email | ImprovMX SMTP | — |

---

## What This System Manages

| Area | Details |
|---|---|
| **Guests** | 80–120 guests, RSVP tracking, meal preferences, seating, plus-ones |
| **Invitations** | HTML email via Gmail SMTP + printed paper invitations |
| **Entourage** | Full Catholic lineup with roles, procession/recessional order, attire, pairing |
| **Ceremony** | Complete nuptial mass order of service with assigned readers and music links |
| **Readings** | Scripture references, full text, assigned readers per reading type |
| **Mass Music** | 7 slots with Parish approval workflow |
| **Reception** | Venue booking, headcount, full program runsheet with emcee scripts and AV cues |
| **Vendors** | All vendors across 21 categories with contract, payment, and status tracking |
| **Budget** | Per-category ceilings with contingency buffer, auto-allocated on vendor booking |
| **Checklist** | 17 vendor-linked sections with tasks, due dates, and assigned contacts |
| **Marriage Prep** | Pre-Cana and canonical requirements with deadlines and document uploads |
| **Gallery / Guestbook** | Post-wedding memories and guest messages page |
| **Sponsors** | Wedding sponsors / principal sponsors list |
| **Seating** | Table assignments and seating chart |

---

## Project Structure

```
wedding-planner/                         ← pnpm workspace root
├── package.json                         ← root scripts
├── pnpm-workspace.yaml
├── .env.local                           ← shared secrets (never committed)
├── .docker/
│   └── compose.yaml                    ← PostgreSQL/PostGIS + Redis + Directus
├── apps/
│   └── web/                            ← Astro 6 SSR (Vercel) — guest-facing site
│       └── src/
│           ├── lib/directus.ts         ← Directus HTTP client
│           ├── lib/api/                ← domain-specific data fetchers
│           ├── lib/types.ts            ← TypeScript interfaces
│           └── pages/                  ← routes: /, /rsvp, /ceremony, /story, etc.
├── packages/
│   ├── directus/                       ← Directus config & extensions
│   │   ├── schemas/snapshot.json       ← full schema backup (import to restore)
│   │   └── extensions/
│   │       └── directus-emoji-picker/  ← custom emoji picker interface extension
│   └── seed/                           ← idempotent seed scripts
│       └── src/
│           ├── runner.js               ← generic seed orchestrator (~4k lines)
│           └── collections/            ← 19 JSON seed files
├── flows/                              ← 7 Directus automation flows (importable)
└── scripts/                            ← helper scripts (e.g. email preview)
```

---

## Commands

```bash
# Docker (PostgreSQL + Redis + Directus)
pnpm directus:start    # Start all containers
pnpm directus:stop     # Stop containers
pnpm directus:logs     # Follow container logs
pnpm directus:cli      # Enter Directus container shell
pnpm db:exec           # Enter PostgreSQL shell

# Astro frontend
pnpm rsvp:dev          # Start Astro dev server on http://localhost:4321
pnpm rsvp:build        # Build Astro for production

# Seeding
pnpm seed                                  # Insert-or-skip (safe, default)
pnpm seed -- --fresh                       # Overwrite existing records (destructive)
pnpm seed -- --collection=persons,vendors  # Seed specific collections only
pnpm seed -- --fields                      # Apply field metadata
pnpm seed:settings / seed:budget / seed:checklist / seed:ceremony / seed:prep

# Emoji picker extension
pnpm run emoji:build   # Build the extension
pnpm run emoji:dev     # Watch mode
pnpm run emoji:lint    # Lint src/
pnpm run emoji:format  # Format src/
```

---

## First-Time Local Setup

1. `pnpm install`
2. Copy `.env.local.example` → `.env.local` and fill in secrets (`SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, SMTP credentials)
3. `pnpm directus:start`
4. `pnpm --filter directus bootstrap` *(first time only)*
5. Open **http://localhost:8055** (Directus admin)
6. Import schema: **Settings → Data Model → Import** → `packages/directus/schemas/snapshot.json`
7. Create admin access token in Directus UI → add to `.env.local` as `DIRECTUS_ADMIN_TOKEN`
8. `pnpm seed`
9. `pnpm rsvp:dev` → open **http://localhost:4321?token=\<rsvp_token_from_guests_collection\>**

---

## Seed Collections (19 files)

```
wedding_settings      → Singleton: dates, couple names, venues, budget ceiling
persons               → All individuals (couple, entourage, vendors)
guests                → All invited guests with full RSVP data
parties               → Guest party/household groupings
entourage             → Roles, procession order, pairing, attire
wedding_roles         → Entourage role definitions
vendors               → All vendor contacts, contracts, payments
budget_categories     → Per-category budget ceilings
checklist_sections    → 17 vendor-linked checklist sections
checklist_tasks       → Tasks per section with due dates
ceremonies            → Ceremony venues and schedules
mass_music            → 7 Parish music slots with approval workflow
readings              → Scripture text, references, assigned readers
clergies              → Officiants and Parish contacts
reception             → Venue booking, confirmed headcount
marriage_prep         → Pre-Cana and canonical requirements
gallery               → Gallery images/albums
sponsors              → Principal and secondary sponsors
honeymoon             → Honeymoon planning details
```

---

## Directus Flows (7 Automations)

| Flow | Trigger | What It Does |
|---|---|---|
| 1. RSVP Token | Guest created | Generates unique token for each guest's RSVP link |
| 2. Email Invitation | Manual bulk action | Sends HTML email via SMTP |
| 3. RSVP Submission | Webhook (RSVP page) | Updates guest record, sets confirmed/declined, sends confirmation |
| 4. RSVP Deadline | Scheduled | Marks all pending guests as `no_response` after deadline |
| 5. Budget Allocation | Vendor → booked | Allocates total_cost to category budget, alerts if over ceiling |
| 6. Budget Payment | Vendor → paid | Syncs paid amount to budget category |
| 7. Recessional Order | Entourage updated | Auto-inverts procession sequence into recessional order |

---

## Directus Roles

| Role | Access |
|---|---|
| `Admin` | Full access to all collections |
| `Coordinator` | Read/write on checklist, vendors, entourage, ceremony, reception. No budget ceiling edits. No guest deletion. |
| `Parish Liaison` | Write only mass_music approval fields. Read on readings. |
| `Read Only` | View-only on entourage, ceremony order, checklist, reception program |

---

## Data Flow: Guest RSVP

1. Guest receives email link: `https://wedding.aazucena.com?token=<uuid>`
2. Astro SSR page fetches guest by `rsvp_token` via public Directus API (only 5 fields exposed)
3. RSVP form submits to **Flow 03 webhook**
4. Flow 03 updates the guest record and sends a confirmation email

**Public Directus role must allow read on `guests`:** `id`, `first_name`, `status`, `plus_ones_allowed`, `rsvp_token` — no other fields.

---

## Production (Railway)

See `RAILWAY.md` for the full setup guide.

```
1. Create Railway project
2. Add PostgreSQL plugin
3. Deploy Directus via Docker image (directus/directus:latest)
4. Set environment variables (see RAILWAY.md Step 4)
5. Add custom domain: planner.aazucena.com
6. Add CNAME in Vercel DNS: planner → Railway domain
7. Add persistent volume at /directus/uploads
8. Import schema: packages/directus/schemas/snapshot.json
9. Run seed scripts against production URL
10. Deploy apps/web to Vercel (DIRECTUS_URL + DIRECTUS_TOKEN env vars)
```

---

## Backup

Railway Hobby plan includes automatic daily PostgreSQL backups. For manual backups:

```bash
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

Store backups externally. Do not rely on Railway alone for irreplaceable wedding data.

---

## Wedding Details

| | |
|---|---|
| **Couple** | Aldrin & Christine |
| **Date** | September 26, 2026 |
| **Admin Panel** | `https://planner.aazucena.com` |
| **Wedding Site** | `https://wedding.aazucena.com` |
