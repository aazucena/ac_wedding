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
```

### Vercel production (Vercel Dashboard → Project → Settings → Environment Variables)
```
DIRECTUS_URL=https://planner.aazucena.com
DIRECTUS_TOKEN=<production-admin-token>
INTERNAL_URL=https://wedding.aazucena.com
```

These are **server-only** — never exposed to the client.

---

## Local Development

```bash
# From workspace root
pnpm rsvp:dev

# Open with a real RSVP token from the guests table
# http://localhost:4321?token=<token>
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

| Route | Description |
|---|---|
| `/` | Homepage / invite landing |
| `/rsvp` | RSVP form (token-gated) |
| `/ceremony` | Ceremony order of service |
| `/story` | Couple's story |
| `/info` | Event details and FAQs |
| `/events` | Schedule / timeline |
| `/wedding-party` | Entourage listing |
| `/seating` | Seating chart |
| `/gallery` | Photo gallery |
| `/guestbook` | Guest messages |
| `/memories` | Post-wedding memories (hashtag feed — deferred) |
| `/partners` | Sponsors |

---

## Key Source Files

- `src/lib/directus.ts` — HTTP client and barrel re-export
- `src/lib/api/` — domain-specific data fetchers (guests, ceremony, etc.)
- `src/lib/types.ts` — TypeScript interfaces (generated from Directus schema)
- `src/pages/api/` — Astro API endpoints: `.ics` calendar export, party lookup, photo upload
