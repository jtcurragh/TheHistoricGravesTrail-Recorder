# Supabase Setup for Historic Graves Trail PWA

## 1. Run migrations

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor**
3. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_email_based_auth.sql` (email-based identity, no Auth)
   - If sync still fails with RLS: run `supabase/migrations/003_fix_rls_for_anon.sql`

**RLS note:** The app uses the anon key only (no Supabase Auth). Policies from 001 use `auth.uid()` which is NULL without Auth, so all operations are denied. Migration 002/003 replace them with permissive policies (`using (true) with check (true)`) so the anon key can read/write. Data scoping is done client-side by email.

## 2. Create storage buckets

Go to **Storage** in the dashboard and create two buckets:

| Bucket name      | Access  | Purpose                                |
|------------------|---------|----------------------------------------|
| `poi-photos`     | **Public** | POI photos and thumbnails           |
| `brochure-assets`| **Public** | Cover photos, funder logos, maps   |

**Important:** Buckets must be **public** so the anon key can upload (email-based identity does not use Supabase Auth).

Path structure:
- `poi-photos/{trail_id}/{filename}`
- `brochure-assets/{trail_id}/{filename}`
