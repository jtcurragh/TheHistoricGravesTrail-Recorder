-- Migration 003: Fix RLS for email-based identity (no Supabase Auth)
-- Run in Supabase Dashboard → SQL Editor
--
-- Problem: Policies from 001 use auth.uid() which is NULL without Auth.
--         With anon key only, all RLS checks fail → sync fails silently.
--
-- Fix: Replace auth-based policies with permissive anon policies.
--      App scopes data by email client-side; RLS allows anon access.

-- Drop auth-based policies (from 001)
drop policy if exists "Own profile only" on user_profile;
drop policy if exists "Group trails only" on trails;
drop policy if exists "Group pois only" on pois;
drop policy if exists "Group brochure only" on brochure_setup;

-- Drop permissive policies if they already exist (from 002)
drop policy if exists "Allow anon all user_profile" on user_profile;
drop policy if exists "Allow anon all trails" on trails;
drop policy if exists "Allow anon all pois" on pois;
drop policy if exists "Allow anon all brochure_setup" on brochure_setup;

-- Create permissive policies for anon key (no Auth session)
create policy "Allow anon all user_profile" on user_profile
  for all to anon using (true) with check (true);

create policy "Allow anon all trails" on trails
  for all to anon using (true) with check (true);

create policy "Allow anon all pois" on pois
  for all to anon using (true) with check (true);

create policy "Allow anon all brochure_setup" on brochure_setup
  for all to anon using (true) with check (true);
