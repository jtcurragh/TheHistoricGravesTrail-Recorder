import { supabase } from '../lib/supabase'
import { saveBrochureSetup } from '../db/brochureSetup'
import { getTrailById } from '../db/trails'
import type { BrochureSetup } from '../types'

const BUCKET = 'brochure-assets'

async function uploadBrochureAsset(
  trailId: string,
  filename: string,
  blob: Blob
): Promise<string> {
  if (!supabase) throw new Error('Supabase not available')
  const path = `${trailId}/${filename}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
  })
  if (error) throw error
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  return data?.signedUrl ?? path
}

/**
 * Save brochure settings to Supabase (brochure_settings table and storage).
 * Uploads cover photo and funder logos to brochure-assets bucket, then upserts row.
 */
export async function saveBrochureSettingsToSupabase(
  setup: BrochureSetup,
  userEmail: string
): Promise<void> {
  if (!supabase) return

  const trail = await getTrailById(setup.trailId)
  if (!trail) return

  let coverPhotoUrl: string | null = null
  const funderLogosUrls: string[] = []

  if (setup.coverPhotoBlob) {
    coverPhotoUrl = await uploadBrochureAsset(
      setup.trailId,
      'cover.jpg',
      setup.coverPhotoBlob
    )
  }
  for (let i = 0; i < setup.funderLogos.length; i++) {
    const url = await uploadBrochureAsset(
      setup.trailId,
      `funder_${i}.png`,
      setup.funderLogos[i]
    )
    funderLogosUrls.push(url)
  }

  const { error } = await supabase.from('brochure_settings').upsert(
    {
      id: setup.trailId,
      user_email: userEmail.trim().toLowerCase(),
      trail_id: setup.trailId,
      trail_type: trail.trailType,
      cover_title: setup.coverTitle,
      group_name: setup.groupName,
      introduction_text: setup.introText,
      funder_text: setup.creditsText,
      cover_photo_url: coverPhotoUrl,
      funder_logos_urls: funderLogosUrls,
      updated_at: setup.updatedAt,
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

/**
 * Restore brochure settings from Supabase for a user.
 * Fetches brochure_settings, downloads cover photo and funder logos, saves to Dexie.
 * Returns the number of brochure settings restored.
 */
export async function restoreBrochureSettingsFromSupabase(
  userEmail: string
): Promise<number> {
  if (!supabase) return 0

  const emailNorm = userEmail.trim().toLowerCase()
  const { data: rows, error } = await supabase
    .from('brochure_settings')
    .select('*')
    .eq('user_email', emailNorm)

  if (error || !rows || rows.length === 0) return 0

  let restored = 0
  for (const row of rows) {
    let coverPhotoBlob: Blob | null = null
    const funderLogos: Blob[] = []

    if (row.cover_photo_url) {
      try {
        const res = await fetch(row.cover_photo_url)
        coverPhotoBlob = await res.blob()
      } catch {
        // continue without cover photo
      }
    }

    const urls = (row.funder_logos_urls as string[] | null) ?? []
    for (const url of urls) {
      try {
        const res = await fetch(url)
        funderLogos.push(await res.blob())
      } catch {
        // skip failed logo
      }
    }

    const setup: BrochureSetup = {
      id: row.trail_id,
      trailId: row.trail_id,
      coverTitle: row.cover_title ?? '',
      coverPhotoBlob,
      groupName: row.group_name ?? '',
      creditsText: row.funder_text ?? '',
      introText: row.introduction_text ?? '',
      funderLogos,
      mapBlob: null,
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }
    await saveBrochureSetup(setup)
    restored++
  }
  return restored
}
