import type {
  POIRecord,
  CreatePOIInput,
  UpdatePOIInput,
  POICategory,
  POICondition,
} from '../types'
import { db } from './database'
import { generatePOIId } from '../utils/idGeneration'

const DEFAULT_CATEGORY: POICategory = 'Other'
const DEFAULT_CONDITION: POICondition = 'Good'

export async function getPOIById(
  id: string,
  options?: { includeBlobs?: boolean }
): Promise<POIRecord | null> {
  const poi = await db.pois.get(id)
  if (!poi) return null

  if (options?.includeBlobs === false) {
    const { photoBlob: _p, thumbnailBlob: _t, ...rest } = poi
    void _p
    void _t
    return { ...rest, photoBlob: undefined, thumbnailBlob: undefined } as unknown as POIRecord
  }
  return poi
}

export async function getPOIsByTrailId(
  trailId: string,
  options?: { includeBlobs?: boolean }
): Promise<POIRecord[]> {
  const pois = await db.pois.where('trailId').equals(trailId).toArray()

  if (options?.includeBlobs === false) {
    return pois.map(({ photoBlob: _p, thumbnailBlob: _t, ...rest }) => {
      void _p
      void _t
      return { ...rest, photoBlob: undefined, thumbnailBlob: undefined }
    }) as unknown as POIRecord[]
  }
  return pois
}

export async function createPOI(input: CreatePOIInput): Promise<POIRecord> {
  const id = generatePOIId(
    input.groupCode,
    input.trailType,
    input.sequence
  )

  const poi: POIRecord = {
    id,
    trailId: input.trailId,
    groupCode: input.groupCode,
    trailType: input.trailType,
    sequence: input.sequence,
    filename: input.filename,
    photoBlob: input.photoBlob,
    thumbnailBlob: input.thumbnailBlob,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    capturedAt: input.capturedAt,
    siteName: input.siteName ?? '',
    category: input.category ?? DEFAULT_CATEGORY,
    description: input.description ?? '',
    story: input.story ?? '',
    url: input.url ?? '',
    condition: input.condition ?? DEFAULT_CONDITION,
    notes: input.notes ?? '',
    completed: !!(input.siteName && input.description),
  }

  await db.pois.add(poi)
  return poi
}

export async function updatePOI(
  id: string,
  updates: UpdatePOIInput
): Promise<void> {
  const existing = await db.pois.get(id)
  if (!existing) throw new Error(`POI not found: ${id}`)

  const completed =
    'siteName' in updates || 'description' in updates
      ? !!(updates.siteName ?? existing.siteName) &&
        !!(updates.description ?? existing.description)
      : existing.completed

  await db.pois.update(id, { ...updates, completed })
}

export async function deletePOI(id: string): Promise<void> {
  await db.pois.delete(id)
}
