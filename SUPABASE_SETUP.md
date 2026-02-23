# Supabase Setup for Historic Graves Trail PWA

## Step-by-step setup

### Step 1: Open Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in
3. Click your project (**The Graveyard Trail Project** or similar)

---

### Step 2: Run table migrations (SQL Editor)

1. In the left sidebar, click **SQL Editor**
2. Click **New query**
3. Open this file on your computer:  
   `supabase/migrations/001_initial_schema.sql`
4. Select all (Cmd+A), copy
5. Paste into the Supabase SQL Editor
6. Click **Run** (or press Cmd+Enter)
7. Wait for "Success. No rows returned"

Repeat for migration 002:

8. Click **New query** again
9. Open `supabase/migrations/002_email_based_auth.sql`
10. Copy all, paste, click **Run**

Repeat for migration 003:

11. Click **New query** again
12. Open `supabase/migrations/003_fix_rls_for_anon.sql`
13. Copy all, paste, click **Run**

---

### Step 3: Run storage migration (fixes POI sync)

1. In SQL Editor, click **New query**
2. Open `supabase/migrations/004_storage_policies_for_anon.sql`
3. Copy all, paste, click **Run**
4. Wait for "Success. No rows returned"

---

### Step 4: Create storage buckets

1. In the left sidebar, click **Storage**
2. Click **New bucket**
3. Name: `poi-photos`
4. Toggle **Public bucket** to ON
5. Click **Create bucket**
6. Click **New bucket** again
7. Name: `brochure-assets`
8. Toggle **Public bucket** to ON
9. Click **Create bucket**

---

### Step 5: Add env vars to Vercel

In Vercel → your project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | From Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | From Supabase → Settings → API → anon public |
| `VITE_MAPBOX_TOKEN` | Your Mapbox public token (pk.…) |

---

## Migration files (in order)

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Tables: user_profile, trails, pois, brochure_setup |
| `002_email_based_auth.sql` | Email-based user_profile, permissive table RLS |
| `003_fix_rls_for_anon.sql` | Fix table RLS if sync still fails |
| `004_storage_policies_for_anon.sql` | Storage RLS so POI photos can upload |

---

## Troubleshooting

**"new row violates row-level security policy"**  
→ Run migration 004 (storage policies). Ensure buckets `poi-photos` and `brochure-assets` exist and are Public.

**Trails sync but POIs don't**  
→ POIs upload photos to storage first. Run migration 004 and ensure both buckets exist.
