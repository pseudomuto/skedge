import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  copyTerm,
  createTerm,
  deleteTerm,
  exportTerm,
  getConfig,
  importTerm,
  listSchedules,
  listTerms,
  renameTerm,
  saveConfig,
  saveSchedule,
} from '../../db/queries'
import { db } from '../../db/schema'
import type { Config } from '../../types/config'
import type { TermExport } from '../../types/term'

const testConfig: Config = {
  blocks: ['09:00', '10:00'],
  subjects: [{ name: 'Math' }],
  classes: [{ name: 'G8', cohorts: ['8A'], subjects: [{ name: 'Math', blocks: 2 }] }],
  teachers: [{ name: 'Smith', room: '101', subjects: [{ class: 'G8', subjects: ['Math'] }] }],
}

beforeEach(async () => {
  await db.open()
})

afterEach(async () => {
  await db.delete()
})

describe('schema', () => {
  it('opens and creates terms table', async () => {
    const terms = await db.terms.toArray()
    expect(terms).toEqual([])
  })
})

describe('term CRUD', () => {
  it('creates and lists terms ordered by createdAt', async () => {
    const id1 = await createTerm('Fall 2025')
    const id2 = await createTerm('Spring 2026')
    const terms = await listTerms()
    expect(terms.map((t) => t.id)).toEqual([id1, id2])
    expect(terms.map((t) => t.name)).toEqual(['Fall 2025', 'Spring 2026'])
  })

  it('renames a term', async () => {
    const id = await createTerm('Old Name')
    await renameTerm(id, 'New Name')
    const terms = await listTerms()
    expect(terms.find((t) => t.id === id)?.name).toBe('New Name')
  })

  it('deleteTerm cascades to config and schedules', async () => {
    const id = await createTerm('Term A')
    await saveConfig(id, testConfig)
    await saveSchedule(id, [], testConfig)

    await deleteTerm(id)

    const terms = await listTerms()
    expect(terms.find((t) => t.id === id)).toBeUndefined()
    expect(await getConfig(id)).toBeUndefined()
    expect(await listSchedules(id)).toEqual([])
  })

  it('copyTerm copies config but not schedules', async () => {
    const srcId = await createTerm('Source')
    await saveConfig(srcId, testConfig)
    await saveSchedule(srcId, [], testConfig)

    const newId = await copyTerm(srcId, 'Copy')

    expect(await getConfig(newId)).toEqual(testConfig)
    expect(await listSchedules(newId)).toEqual([])
  })
})

describe('exportTerm', () => {
  it('exports name, config and schedules with db fields stripped', async () => {
    const termId = await createTerm('Fall 2025')
    await saveConfig(termId, testConfig)
    await saveSchedule(termId, [], testConfig, 'Week 1')

    const result = await exportTerm(termId)

    expect(result.version).toBe(1)
    expect(result.name).toBe('Fall 2025')
    expect(result.config).toEqual(testConfig)
    expect(result.schedules).toHaveLength(1)
    expect(result.schedules[0].label).toBe('Week 1')
    expect(result.schedules[0].schedule).toEqual([])
    expect(result.schedules[0].configSnapshot).toEqual(testConfig)
    expect((result.schedules[0] as Record<string, unknown>).id).toBeUndefined()
    expect((result.schedules[0] as Record<string, unknown>).termId).toBeUndefined()
  })

  it('exports config as null when no config saved', async () => {
    const termId = await createTerm('Empty Term')

    const result = await exportTerm(termId)

    expect(result.config).toBeNull()
    expect(result.schedules).toEqual([])
  })
})

describe('importTerm', () => {
  it('creates a new term with config and schedules stamped with the new termId', async () => {
    const data: TermExport = {
      version: 1,
      name: 'Fall 2025',
      exportedAt: 1000000,
      config: testConfig,
      schedules: [{ generatedAt: 1000000, label: 'Week 1', schedule: [], configSnapshot: testConfig }],
    }

    const newId = await importTerm('Imported Term', data)

    const terms = await listTerms()
    expect(terms.find((t) => t.id === newId)?.name).toBe('Imported Term')
    expect(await getConfig(newId)).toEqual(testConfig)
    const schedules = await listSchedules(newId)
    expect(schedules).toHaveLength(1)
    expect(schedules[0].label).toBe('Week 1')
    expect(schedules[0].termId).toBe(newId)
  })

  it('handles null config gracefully - no config row written', async () => {
    const data: TermExport = {
      version: 1,
      name: 'Empty Term',
      exportedAt: 1000000,
      config: null,
      schedules: [],
    }

    const newId = await importTerm('Imported Empty', data)

    expect(await getConfig(newId)).toBeUndefined()
    expect(await listSchedules(newId)).toEqual([])
  })
})
