import Dexie, { type Table } from 'dexie'

import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'

interface StoredConfig {
  id: number
  data: Config
  updatedAt: number
}

interface StoredSchedule {
  id?: number
  generatedAt: number
  label: string
  schedule: ScheduleClass[]
  configSnapshot: Config
}

class SkedgeDB extends Dexie {
  configs!: Table<StoredConfig, number>
  schedules!: Table<StoredSchedule, number>

  constructor() {
    super('skedge')
    this.version(1).stores({
      configs: 'id',
      schedules: '++id, generatedAt',
    })
  }
}

export const db = new SkedgeDB()
export type { StoredConfig, StoredSchedule }
