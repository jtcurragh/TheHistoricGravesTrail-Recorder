import Dexie, { type Table } from 'dexie'
import type { UserProfile, Trail, POIRecord } from '../types'

const DB_NAME =
  import.meta.env?.MODE === 'test' ? 'tmt-recorder-test' : 'tmt-recorder'

class TMTDatabase extends Dexie {
  userProfile!: Table<UserProfile, string>
  trails!: Table<Trail, string>
  pois!: Table<POIRecord, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      userProfile: 'id',
      trails: 'id, groupCode, [groupCode+trailType]',
      pois: 'id, trailId, [trailId+sequence]',
    })
  }
}

export const db = new TMTDatabase()
