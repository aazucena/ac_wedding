# Wedding Site — apps/web
**Astro 6 SSR — deploys to Vercel at `wedding.aazucena.com`**

---

## Stack

- **Framework:** Astro 6 (SSR with Vercel adapter)
- **Styling:** Tailwind CSS v4
- **Fonts:** Cormorant Garamond + Jost (Google Fonts)
- **Deploy:** Vercel (server-side rendered — requires Node.js runtime)

---

## How RSVP works

1. Guest receives email with personalised link: `https://wedding.aazucena.com?token=<uuid>`
2. Astro SSR page reads `?token` from the URL server-side
3. Fetches guest from Directus by `rsvp_token` (public read, 5 fields only)
4. Shows personalised greeting with guest's first name
5. Guest selects attending / not attending
6. On submit: POSTs to Directus Flow 03 webhook
7. Flow 03 updates the guest record and sends a confirmation email

---

## Directus Public Role Permissions

In Directus → **Settings → Roles & Permissions → Public**:

| Collection | Action | Fields |
|---|---|---|
| `guests` | Read | `id`, `first_name`, `status`, `plus_ones_allowed`, `rsvp_token` |

Only expose these 5 fields — not email, table_number, or any other PII.

---

## Environment Variables

### Local development (`.env.local` in workspace root)
```
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=<admin-access-token>
INTERNAL_URL=http://localhost:4321
PREVIEW_TOKEN=<any-secret-string>
```

### Vercel production (Vercel Dashboard → Project → Settings → Environment Variables)
```
DIRECTUS_URL=https://planner.aazucena.com
DIRECTUS_TOKEN=<production-admin-token>
INTERNAL_URL=https://wedding.aazucena.com
PREVIEW_TOKEN=<strong-random-secret>
```

These are **server-only** — never exposed to the client.

### Preview token

`PREVIEW_TOKEN` unlocks date-gated pages (`/seating`, `/memories`) for admin review before the live date. Visit any gated page with `?preview=<token>` — the token is stored in an HttpOnly cookie for 2 hours so you don't need to re-append it on every page.

---

## Local Development

```bash
# From workspace root
pnpm rsvp:dev          # Start dev server at http://localhost:4321
pnpm rsvp:check        # Run astro check (TypeScript diagnostics)
pnpm rsvp:build        # Production build

# Open with a real RSVP token from the guests table
# http://localhost:4321/rsvp/<token>

# Preview date-gated pages (bypass gate for 2h)
# http://localhost:4321/seating?preview=<PREVIEW_TOKEN>
# http://localhost:4321/memories?preview=<PREVIEW_TOKEN>
```

---

## Deploy to Vercel

Connect the repo in the Vercel dashboard and set:
- **Root Directory:** `apps/web`
- **Build Command:** `pnpm build`
- **Framework Preset:** Astro
- **Output:** SSR (Vercel adapter handles this automatically)

Or via CLI:
```bash
vercel deploy --prod
```

---

## Pages

| Route | Description | Gate |
|---|---|---|
| `/` | Homepage / invite landing | Public |
| `/rsvp/[token]` | RSVP form (token-gated per guest) | Valid `rsvp_token` |
| `/ceremony` | Ceremony order of service | Public |
| `/story` | Couple's story | Public |
| `/info` | Event details and FAQs | Public |
| `/events` | Schedule / timeline | Public |
| `/wedding-party` | Entourage listing | Public |
| `/seating` | Seating chart | 14 days before wedding date |
| `/gallery` | Photo gallery | Public |
| `/guestbook` | Guest messages | Public |
| `/memories` | Post-wedding memories (photos + guestbook) | After wedding date |
| `/partners` | Sponsors | Public |
| `/print/mass` | Nuptial mass booklet (print layout) | Public |
| `/print/invitation` | Invitation print layout | Public |

Pages marked with a date gate redirect to `/` until the unlock date is reached. The `PREVIEW_TOKEN` env var bypasses all gates for admin review (sets an HttpOnly cookie valid for 2 hours).

---

## Key Source Files

- `src/lib/directus.ts` — HTTP client and barrel re-export
- `src/lib/api/` — domain-specific data fetchers (guests, ceremony, etc.)
- `src/lib/types.ts` — TypeScript interfaces (generated from Directus schema)
- `src/pages/api/` — Astro API endpoints: `.ics` calendar export, party lookup, photo upload
