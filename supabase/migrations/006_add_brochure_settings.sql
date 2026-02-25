-- Migration 006: Brochure settings table for per-trail persistence
-- Run in Supabase Dashboard → SQL Editor
--
-- Stores brochure settings per user per trail. Cover photo and funder logos
-- are stored in brochure-assets bucket; this table holds URLs.

create table if not exists brochure_settings (
  id text primary key,
  user_email text not null references user_profile(email) on delete cascade,
  trail_id text not null references trails(id) on delete cascade,
  trail_type text not null check (trail_type in ('graveyard', 'parish')),
  cover_title text,
  group_name text,
  introduction_text text,
  funder_text text,
  cover_photo_url text,
  funder_logos_urls jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_email, trail_id)
);

create trigger brochure_settings_updated_at before update on brochure_settings
  for each row execute function update_updated_at();

alter table brochure_settings enable row level security;

create policy "Allow anon all brochure_settings" on brochure_settings
  for all to anon using (true) with check (true);
