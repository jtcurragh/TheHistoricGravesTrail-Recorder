-- Migration 004: Storage RLS policies for anon uploads
-- Run in Supabase Dashboard → SQL Editor
--
-- POI sync uploads photos to poi-photos bucket. Without these policies,
-- storage uploads fail with "new row violates row-level security policy".

-- Remove any existing policies for these buckets
drop policy if exists "Allow anon upload poi-photos" on storage.objects;
drop policy if exists "Allow anon update poi-photos" on storage.objects;
drop policy if exists "Allow anon upload brochure-assets" on storage.objects;
drop policy if exists "Allow anon update brochure-assets" on storage.objects;
drop policy if exists "Allow anon select poi-photos" on storage.objects;
drop policy if exists "Allow anon select brochure-assets" on storage.objects;
drop policy if exists "Allow anon poi and brochure storage" on storage.objects;

-- Single policy for both buckets (INSERT, UPDATE, SELECT)
create policy "Allow anon poi and brochure storage"
on storage.objects
for all
to anon
using (bucket_id in ('poi-photos', 'brochure-assets'))
with check (bucket_id in ('poi-photos', 'brochure-assets'));
