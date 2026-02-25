import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveBrochureSettingsToSupabase,
  restoreBrochureSettingsFromSupabase,
} from './brochureSettingsService'
import { db } from '../db/database'
import { getBrochureSetup } from '../db/brochureSetup'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'

const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' })
const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const photoArrayBuffer = photoBytes.buffer

vi.mock('../lib/supabase', () => {
  const mockBrochureSettings = {
    id: 'jane-graveyard',
    user_email: 'jane@test.com',
    trail_id: 'jane-graveyard',
    trail_type: 'graveyard',
    cover_title: 'Jane Heritage Trail',
    group_name: "Jane's recordings",
    introduction_text: 'Welcome to our trail.',
    funder_text: 'Heritage Council',
    credits_text: 'Funded by local council.',
    cover_photo_url: 'https://example.com/cover.jpg',
    funder_logos_urls: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => {
            if (table === 'brochure_settings' && col === 'user_email') {
              return Promise.resolve({
                data: val === 'jane@test.com' ? [mockBrochureSettings] : [],
                error: null,
              })
            }
            return Promise.resolve({ data: [], error: null })
          },
        }),
        upsert: (data: unknown) => Promise.resolve({ data, error: null }),
      }),
      storage: {
        from: () => ({
          upload: () =>
            Promise.resolve({ data: { path: 'jane-graveyard/cover.jpg' }, error: null }),
          createSignedUrl: () =>
            Promise.resolve({
              data: { signedUrl: 'https://example.com/cover.jpg' },
              error: null,
            }),
        }),
      },
    },
  }
})

describe('brochureSettingsService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await db.delete()
    await db.open()
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(photoArrayBuffer))
    ) as typeof fetch
  })

  describe('saveBrochureSettingsToSupabase', () => {
    it('uploads cover photo to storage and upserts to brochure_settings', async () => {
      await createUserProfile({
        email: 'jane@test.com',
        name: 'Jane',
        groupCode: 'jane',
      })
      await createTrail({
        groupCode: 'jane',
        trailType: 'graveyard',
        displayName: 'Jane Graveyard Trail',
      })

      const setup = {
        id: 'jane-graveyard',
        trailId: 'jane-graveyard',
        coverTitle: 'Jane Heritage Trail',
        coverPhotoBlob: mockBlob,
        groupName: "Jane's recordings",
        funderText: 'Heritage Council',
        creditsText: 'Funded by local council.',
        introText: 'Welcome to our trail.',
        mapBlob: null,
        updatedAt: new Date().toISOString(),
      }

      await expect(
        saveBrochureSettingsToSupabase(setup, 'jane@test.com')
      ).resolves.not.toThrow()
    })
  })

  describe('restoreBrochureSettingsFromSupabase', () => {
    it('fetches brochure_settings from Supabase and saves to Dexie with downloaded blobs', async () => {
      await createUserProfile({
        email: 'jane@test.com',
        name: 'Jane',
        groupCode: 'jane',
      })
      await createTrail({
        groupCode: 'jane',
        trailType: 'graveyard',
        displayName: 'Jane Graveyard Trail',
      })

      const count = await restoreBrochureSettingsFromSupabase('jane@test.com')
      expect(count).toBe(1)

      const retrieved = await getBrochureSetup('jane-graveyard')
      expect(retrieved).toBeDefined()
      expect(retrieved?.coverTitle).toBe('Jane Heritage Trail')
      expect(retrieved?.groupName).toBe("Jane's recordings")
      expect(retrieved?.introText).toBe('Welcome to our trail.')
      expect(retrieved?.funderText).toBe('Heritage Council')
      expect(retrieved?.creditsText).toBe('Funded by local council.')
      expect(retrieved?.coverPhotoBlob).toBeInstanceOf(Blob)
      expect(retrieved?.coverPhotoBlob?.size).toBe(photoArrayBuffer.byteLength)
    })

    it('returns 0 when no brochure settings exist for user', async () => {
      await createUserProfile({
        email: 'new@test.com',
        name: 'New User',
        groupCode: 'new',
      })

      const count = await restoreBrochureSettingsFromSupabase('new@test.com')
      expect(count).toBe(0)
    })
  })
})
