import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BROCHURE_TRAIL_KEY = 'hgt_brochure_trail_id'
import { getBrochureSetup, saveBrochureSetup } from '../db/brochureSetup'
import { getUserProfile } from '../db/userProfile'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { generateStaticMap } from '../utils/mapbox'
import { fixOrientation } from '../utils/thumbnail'
import { INTRO_WORD_LIMIT } from '../utils/pdfExport'
import type { BrochureSetup } from '../types'

function CoverPhotoPreview({ blob }: { blob: Blob }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return null
  return (
    <img
      src={src}
      alt="Cover photo preview"
      className="max-h-32 object-contain border-2 border-[#0b0c0c]"
    />
  )
}

export function BrochureSetupScreen() {
  const { state, search } = useLocation() as {
    state?: { trailId?: string }
    search: string
  }
  const navigate = useNavigate()
  const trailId =
    state?.trailId ?? new URLSearchParams(search).get('trailId')

  const [trail, setTrail] = useState<{ id: string; displayName: string } | null>(null)
  const [coverTitle, setCoverTitle] = useState('')
  const [groupName, setGroupName] = useState('')
  const [coverPhotoBlob, setCoverPhotoBlob] = useState<Blob | null>(null)
  const [introText, setIntroText] = useState('')
  const [funderText, setFunderText] = useState('')
  const [creditsText, setCreditsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [trailNotFound, setTrailNotFound] = useState(false)

  const loadData = useCallback(async () => {
    if (!trailId) return
    setTrailNotFound(false)
    const [t, setup, profile] = await Promise.all([
      getTrailById(trailId),
      getBrochureSetup(trailId),
      getUserProfile(),
    ])
    if (t) {
      setTrail({ id: t.id, displayName: t.displayName })
    } else {
      setTrailNotFound(true)
    }
    if (profile) setGroupName(profile.groupName)
    if (setup) {
      setCoverTitle(setup.coverTitle)
      setGroupName(setup.groupName)
      setCoverPhotoBlob(setup.coverPhotoBlob)
      setIntroText(setup.introText)
      setFunderText(setup.funderText)
      setCreditsText(setup.creditsText)
    }
  }, [trailId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file?.type.startsWith('image/')) {
      try {
        console.log('[CoverPhoto] Processing image orientation...')
        const fixed = await fixOrientation(file)
        console.log('[CoverPhoto] Orientation fixed, size:', fixed.size)
        setCoverPhotoBlob(fixed)
      } catch (err) {
        console.error('[CoverPhoto] Failed to process image:', err)
        setCoverPhotoBlob(file)
      }
    }
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trailId || !trail) return
    const newErrors: Record<string, string> = {}
    if (!coverTitle.trim()) newErrors.coverTitle = 'Cover title is required'
    if (!groupName.trim()) newErrors.groupName = 'Community group name is required'
    if (!introText.trim()) newErrors.introText = 'Introduction is required'
    // Cover photo is now optional
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSaving(true)
    try {
      const pois = await getPOIsByTrailId(trailId, { includeBlobs: false })
      console.log('[BrochureSetup] Found POIs:', pois.length)
      const mapBlob = await generateStaticMap(pois)
      console.log('[BrochureSetup] Generated map blob:', mapBlob ? `${mapBlob.size} bytes` : 'null')
      
      const setup: BrochureSetup = {
        id: trailId,
        trailId,
        coverTitle: coverTitle.trim(),
        coverPhotoBlob,
        groupName: groupName.trim(),
        funderText: funderText.trim(),
        creditsText: creditsText.trim(),
        introText: introText.trim(),
        mapBlob,
        updatedAt: new Date().toISOString(),
      }
      await saveBrochureSetup(setup)
      console.log('[BrochureSetup] Saved brochure setup with map blob')
      setSaved(true)
      localStorage.setItem(BROCHURE_TRAIL_KEY, trailId)
      setTimeout(() => {
        setSaved(false)
        navigate('/export')
      }, 1000)
    } catch (err) {
      console.error('[BrochureSetup] Save failed:', err)
      if (err instanceof Error) {
        console.error('[BrochureSetup] Error message:', err.message)
        console.error('[BrochureSetup] Stack:', err.stack)
      }
      setErrors({ submit: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (!trailId) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">
          No trail selected. Go to Export and choose a trail first.
        </p>
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="mt-4 min-h-[56px] px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px]"
        >
          Back to Export
        </button>
      </main>
    )
  }

  if (!trail && !trailNotFound) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">Loading...</p>
      </main>
    )
  }

  if (trailNotFound) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">Trail not found.</p>
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="mt-4 min-h-[56px] px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px]"
        >
          Back to Export
        </button>
      </main>
    )
  }

  if (!trail) return null

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/export')}
        className="mb-4 flex items-center gap-2 text-[#2d7a6e] font-bold text-lg"
        aria-label="Back to Export"
      >
        ← Back to Export
      </button>

      <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-4" id="brochure-setup-heading">
        Brochure Setup
      </h1>

      <div
        className="mb-6 p-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]"
        role="region"
        aria-label="Notice"
      >
        <p className="text-[#0b0c0c]">
          This information will appear on the cover and credits pages of your
          digital brochure. You can update it at any time.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <label
            htmlFor="coverTitle"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Cover Title <span className="text-govuk-red">*</span>
          </label>
          {errors.coverTitle && (
            <p
              id="coverTitle-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.coverTitle}
            </p>
          )}
          <input
            id="coverTitle"
            type="text"
            value={coverTitle}
            onChange={(e) => setCoverTitle(e.target.value)}
            placeholder="e.g. Clonfert Trails Heritage Trail"
            aria-required
            aria-invalid={!!errors.coverTitle}
            aria-describedby={errors.coverTitle ? 'coverTitle-error' : undefined}
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
          />
        </div>

        <div>
          <label
            htmlFor="groupName"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Community Group Name <span className="text-govuk-red">*</span>
          </label>
          {errors.groupName && (
            <p
              id="groupName-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.groupName}
            </p>
          )}
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Clonfert Tidy Towns"
            aria-required
            aria-invalid={!!errors.groupName}
            aria-describedby={errors.groupName ? 'groupName-error' : undefined}
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
          />
        </div>

        <div>
          <label className="block text-lg font-bold text-[#1a2a2a] mb-2">
            Cover Photo (optional)
          </label>
          <p className="text-sm text-[#595959] mb-2">
            Upload a photo or leave blank for text-only cover
          </p>
          {errors.coverPhoto && (
            <p className="text-govuk-red font-bold mb-2" role="alert">
              {errors.coverPhoto}
            </p>
          )}
          <input
            id="coverPhoto"
            type="file"
            accept="image/*"
            onChange={handleCoverPhotoChange}
            aria-label="Upload cover photo"
            className="block w-full min-h-[48px] file:min-h-[48px] file:px-4 file:py-3 file:border-2 file:border-[#0b0c0c] file:bg-white file:font-bold file:text-[#0b0c0c] file:cursor-pointer file:rounded-lg"
          />
          {coverPhotoBlob && (
            <div className="mt-2">
              <CoverPhotoPreview blob={coverPhotoBlob} />
              <button
                type="button"
                onClick={() => setCoverPhotoBlob(null)}
                className="mt-1 text-govuk-red font-bold text-sm"
              >
                Remove cover photo
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="introText"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Introduction <span className="text-govuk-red">*</span>
          </label>
          {errors.introText && (
            <p
              id="introText-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.introText}
            </p>
          )}
          <textarea
            id="introText"
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            rows={5}
            placeholder={`3–5 sentences about the trail and community (max ${INTRO_WORD_LIMIT} words)`}
            aria-required
            aria-invalid={!!errors.introText}
            aria-describedby={errors.introText ? 'introText-error' : undefined}
            className="block w-full px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg resize-y"
          />
          <p className="mt-1 text-sm text-[#595959]">
            {introText.trim().split(/\s+/).filter(Boolean).length} / {INTRO_WORD_LIMIT} words
          </p>
        </div>

        <div>
          <label
            htmlFor="funderText"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Funded and Supported By
          </label>
          <input
            id="funderText"
            type="text"
            value={funderText}
            onChange={(e) => setFunderText(e.target.value)}
            placeholder="Sponsor names (e.g. Local Council, Heritage Council)"
            className="block w-full px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
          />
        </div>

        <div>
          <label
            htmlFor="creditsText"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Credits &amp; Acknowledgements
          </label>
          <textarea
            id="creditsText"
            value={creditsText}
            onChange={(e) => setCreditsText(e.target.value)}
            rows={4}
            placeholder="Funded by, supported by, acknowledgements (max 40 words)"
            className="block w-full px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg resize-y"
          />
          <p className="mt-1 text-sm text-[#595959]">
            {creditsText.trim().split(/\s+/).filter(Boolean).length} / 40 words
          </p>
        </div>

        {errors.submit && (
          <p className="text-govuk-red font-bold" role="alert">
            {errors.submit}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[56px] w-full px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saved ? 'Brochure setup saved' : 'Save Brochure Setup'}
        </button>
      </form>
    </main>
  )
}
