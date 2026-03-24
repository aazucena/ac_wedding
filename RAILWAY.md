# Directus on Railway — Setup Guide
**Catholic Wedding Planner — September 26, 2026**  
**Stack:** Railway + PostgreSQL (built-in) + custom domain `planner.aazucena.com`

---

## What You'll Have After This Guide

- Directus running at `https://planner.aazucena.com`
- PostgreSQL database provisioned inside Railway
- Email sending via Gmail SMTP
- Ready for schema snapshot import

**Time to complete:** ~20 minutes

---

## Prerequisites

1. **Railway account** — [https://railway.app](https://railway.app)  
   Free tier works for setup, but upgrade to the Hobby plan ($5/month) before going live — the free tier sleeps after inactivity which will break your RSVP links.

2. **Railway CLI (optional but useful)**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Vercel access** to `aazucena.com` DNS settings — you'll need to add one CNAME record.

4. **Gmail App Password** — see Step 5.

---

## Step 1 — Create a New Railway Project

1. Go to [https://railway.app/new](https://railway.app/new)
2. Click **Empty Project**
3. Name it `wedding-planner`

---

## Step 2 — Add PostgreSQL

Inside your Railway project:

1. Click **+ New** → **Database** → **PostgreSQL**
2. Railway provisions it instantly and generates connection credentials
3. Click the PostgreSQL service → **Variables** tab
4. Note these values — you'll need them in Step 4:
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`

> Railway also provides a single `DATABASE_URL` string. Directus doesn't use that format directly — you need the individual variables above.

---

## Step 3 — Deploy Directus

Inside your Railway project:

1. Click **+ New** → **GitHub Repo** → select this repository
2. Set **Root Directory** to `packages/directus`
3. Railway detects the `Dockerfile` and builds it automatically
4. Click **Deploy**

Railway will build the image (baking in the emoji picker extension and email templates) and attempt to start it — it will fail on first run because environment variables aren't set yet. That's expected.

> **Why not Docker Hub image?** The vanilla `directus/directus` image doesn't include the custom emoji picker extension or email templates. The Dockerfile in `packages/directus/` extends the pinned base image and copies them in.

---

## Step 4 — Set Environment Variables

Click on your Directus service → **Variables** tab → add each of these:

### Core

| Variable | Value |
|---|---|
| `SECRET` | Generate at [https://generate-secret.vercel.app/64](https://generate-secret.vercel.app/64) |
| `ADMIN_EMAIL` | `your@email.com` |
| `ADMIN_PASSWORD` | A strong password you'll remember |
| `PUBLIC_URL` | `https://planner.aazucena.com` (set this even before DNS is ready) |

### Database (use values from Step 2)

| Variable | Value |
|---|---|
| `DB_CLIENT` | `pg` |
| `DB_HOST` | Value of `PGHOST` from PostgreSQL service |
| `DB_PORT` | Value of `PGPORT` (usually `5432`) |
| `DB_DATABASE` | Value of `PGDATABASE` |
| `DB_USER` | Value of `PGUSER` |
| `DB_PASSWORD` | Value of `PGPASSWORD` |

### Email (Gmail SMTP)

| Variable | Value |
|---|---|
| `EMAIL_FROM` | `your@gmail.com` |
| `EMAIL_TRANSPORT` | `smtp` |
| `EMAIL_SMTP_HOST` | `smtp.gmail.com` |
| `EMAIL_SMTP_PORT` | `587` |
| `EMAIL_SMTP_USER` | `your@gmail.com` |
| `EMAIL_SMTP_PASSWORD` | Your Gmail App Password (see Step 5) |
| `EMAIL_SMTP_SECURE` | `false` |

### Storage (Railway persistent volume)

| Variable | Value |
|---|---|
| `STORAGE_LOCATIONS` | `local` |
| `STORAGE_LOCAL_ROOT` | `/directus/uploads` |

After adding all variables, Railway will automatically redeploy. Watch the **Deploy Logs** — you should see:

```
✅ Server started at http://0.0.0.0:8055
```

---

## Step 5 — Gmail App Password

Your normal Gmail password won't work for SMTP. You need an App Password:

1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already on
3. Search for **App passwords** in the search bar
4. Select app: **Mail** → device: **Other** → type `Directus Wedding`
5. Google generates a 16-character password like `abcd efgh ijkl mnop`
6. Remove the spaces → `abcdefghijklmnop`
7. Paste this as `EMAIL_SMTP_PASSWORD` in Railway

---

## Step 6 — Add Custom Domain on Railway

1. Click your Directus service → **Settings** → **Networking** → **Custom Domain**
2. Enter: `planner.aazucena.com`
3. Railway shows you a CNAME target like:  
   `yourapp.up.railway.app`
4. Copy that value — you need it in Step 7

---

## Step 7 — Add CNAME Record in Vercel

Since `aazucena.com` is managed by Vercel:

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your `aazucena.com` project → **Settings** → **Domains**
3. Click **Manage** on `aazucena.com` → **DNS Records**
4. Add a new record:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `wedding` | `yourapp.up.railway.app` (from Step 6) |

5. Save. DNS propagation takes 5–30 minutes.
6. Railway auto-provisions SSL once the CNAME resolves.

**Verify it's working:**
```bash
nslookup planner.aazucena.com
# Should return the Railway IP
```

---

## Step 8 — Verify the Full Setup

- [ ] `https://planner.aazucena.com` loads the Directus login page
- [ ] You can log in with your admin credentials
- [ ] **Settings → Email** → send a test email to yourself and it arrives
- [ ] PostgreSQL service in Railway shows active connections
- [ ] Railway deploy logs show no errors

---

## Step 9 — Persistent Storage for Uploads

Railway's filesystem is ephemeral by default — uploaded files (contract PDFs, marriage prep documents) will be lost on redeploy. Fix this before importing real data:

1. In your Directus service → **Settings** → **Volumes**
2. Click **Add Volume**
3. Mount path: `/directus/uploads`
4. This persists all uploaded files across deploys

---

## Step 10 — Next Steps

1. **Import schema snapshot JSON**
   Go to Directus → **Settings → Data Model → Import Schema** → upload `packages/directus/schemas/snapshot.json`

2. **Run seed data**  
   Populates `wedding_settings`, `budget_categories`, `checklist_sections`, `ceremony_order`, and `marriage_prep`

3. **Import Flows**  
   Go to **Settings → Flows** → import each flow JSON

4. **Deploy wedding site (Astro SSR)**
   Deploy `apps/web` to Vercel. Set `DIRECTUS_URL=https://planner.aazucena.com` and `DIRECTUS_TOKEN` in Vercel env vars. Site will be live at `wedding.aazucena.com`.

---

## Useful Railway CLI Commands

```bash
# Link local folder to Railway project
railway link

# View live logs
railway logs

# Open your deployed app
railway open

# Set an environment variable from CLI
railway variables set SECRET=yoursecrethere

# Run a one-off command (e.g. database operations)
railway run npx directus schema apply packages/directus/schemas/snapshot.json
```

---

## Backup Strategy

Railway's PostgreSQL includes automatic daily backups on the Hobby plan. For manual backups:

```bash
# Connect to Railway PostgreSQL and dump
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

Store backups in Google Drive or any external location. Do not rely solely on Railway backups for wedding data.

---

## Troubleshooting

### Directus crashes on startup
Check **Deploy Logs** in Railway. 90% of the time it's a missing or wrong environment variable. The most common culprits are `DB_HOST` (copy it exactly from the PostgreSQL service variables, not from memory) and `SECRET` (must be set, cannot be empty).

### CNAME not resolving
Vercel DNS changes can take up to 30 minutes. Check propagation at [https://dnschecker.org](https://dnschecker.org) — search for `planner.aazucena.com` type `CNAME`.

### SSL not provisioning on Railway
SSL auto-provisions only after the CNAME resolves correctly. If it's been over an hour after DNS propagates, go to Railway → Directus service → Settings → Networking → click **Refresh Certificate**.

### Uploaded files disappear after redeploy
You skipped Step 9. Add the persistent volume at `/directus/uploads` immediately.

### Forgot admin password
In Railway CLI:
```bash
railway run npx directus users passwd --email your@email.com --password NewPassword123!
```