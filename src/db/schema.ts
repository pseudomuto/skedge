import Dexie, { type Table } from 'dexie'

import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'

interface StoredTerm {
  id?: number
  name: string
  createdAt: number
}

interface StoredConfig {
  id: number
  termId: number
  data: Config
  updatedAt: number
}

interface StoredSchedule {
  id?: number
  termId: number
  generatedAt: number
  label: string
  schedule: ScheduleClass[]
  configSnapshot: Config
}

class SkedgeDB extends Dexie {
  terms!: Table<StoredTerm, number>
  configs!: Table<StoredConfig, number>
  schedules!: Table<StoredSchedule, number>

  constructor() {
    super('skedge')
    this.version(1).stores({
      configs: 'id',
      schedules: '++id, generatedAt',
    })
    this.version(2)
      .stores({
        terms: '++id, createdAt',
        configs: 'id, termId',
        schedules: '++id, generatedAt, termId',
      })
      .upgrade(async (tx) => {
        const termId = await tx.table('terms').add({ name: 'Default', createdAt: Date.now() })
        await tx.table('configs').toCollection().modify({ termId })
        await tx.table('schedules').toCollection().modify({ termId })
      })
  }
}

export const db = new SkedgeDB()
export type { StoredTerm, StoredConfig, StoredSchedule }
