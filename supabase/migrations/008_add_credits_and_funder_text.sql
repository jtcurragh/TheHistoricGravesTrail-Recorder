-- Migration 008: Add credits_text to brochure_settings, funder_text to brochure_setup
-- Run in Supabase Dashboard → SQL Editor
--
-- brochure_settings: funder_text stores sponsor names; credits_text stores credits & acknowledgements
-- brochure_setup: add funder_text for sponsor names (credits_text already exists)

alter table brochure_settings add column if not exists credits_text text;
alter table brochure_setup add column if not exists funder_text text;
