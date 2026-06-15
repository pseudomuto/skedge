import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'
import type { TermExport } from '../types/term'
import { db } from './schema'
import type { StoredSchedule, StoredTerm } from './schema'

// Term queries

export async function listTerms(): Promise<StoredTerm[]> {
  return db.terms.orderBy('createdAt').toArray()
}

export async function createTerm(name: string): Promise<number> {
  return db.terms.add({ name, createdAt: Date.now() }) as Promise<number>
}

export async function renameTerm(id: number, name: string): Promise<void> {
  await db.terms.update(id, { name })
}

export async function deleteTerm(id: number): Promise<void> {
  await db.transaction('rw', [db.terms, db.configs, db.schedules], async () => {
    await db.terms.delete(id)
    await db.configs.where('termId').equals(id).delete()
    await db.schedules.where('termId').equals(id).delete()
  })
}

export async function copyTerm(sourceId: number, name: string): Promise<number> {
  return db.transaction('rw', [db.terms, db.configs], async () => {
    const sourceConfig = await db.configs.get(sourceId)
    const newTermId = (await db.terms.add({ name, createdAt: Date.now() })) as number
    if (sourceConfig) {
      await db.configs.put({ id: newTermId, termId: newTermId, data: sourceConfig.data, updatedAt: Date.now() })
    }
    return newTermId
  })
}

// Config queries

export async function getConfig(termId: number): Promise<Config | undefined> {
  const stored = await db.configs.get(termId)
  return stored?.data
}

export async function saveConfig(termId: number, data: Config): Promise<void> {
  await db.configs.put({ id: termId, termId, data, updatedAt: Date.now() })
}

// Schedule queries

export async function listSchedules(termId: number): Promise<StoredSchedule[]> {
  const all = (await db.schedules.toArray()).filter((s) => s.termId === termId)
  return all.sort((a, b) => b.generatedAt - a.generatedAt)
}

export async function saveSchedule(
  termId: number,
  schedule: ScheduleClass[],
  config: Config,
  label?: string,
): Promise<number> {
  const generatedAt = Date.now()
  const resolvedLabel = label ?? new Date(generatedAt).toLocaleDateString()
  const id = await db.schedules.add({ termId, generatedAt, label: resolvedLabel, schedule, configSnapshot: config })
  return id as number
}

export async function deleteSchedule(id: number): Promise<void> {
  await db.schedules.delete(id)
}

export async function importTerm(name: string, data: TermExport): Promise<number> {
  return db.transaction('rw', [db.terms, db.configs, db.schedules], async () => {
    const newTermId = (await db.terms.add({ name, createdAt: Date.now() })) as number
    if (data.config !== null) {
      await db.configs.put({ id: newTermId, termId: newTermId, data: data.config, updatedAt: Date.now() })
    }
    if (data.schedules.length > 0) {
      await db.schedules.bulkAdd(
        data.schedules.map(({ generatedAt, label, schedule, configSnapshot }) => ({
          termId: newTermId,
          generatedAt,
          label,
          schedule,
          configSnapshot,
        })),
      )
    }
    return newTermId
  })
}

export async function exportTerm(termId: number): Promise<TermExport> {
  const term = await db.terms.get(termId)
  const stored = await db.configs.get(termId)
  const schedules = (await db.schedules.toArray()).filter((s) => s.termId === termId)
  return {
    version: 1,
    name: term?.name ?? '',
    exportedAt: Date.now(),
    config: stored?.data ?? null,
    schedules: schedules.map(({ generatedAt, label, schedule, configSnapshot }) => ({
      generatedAt,
      label,
      schedule,
      configSnapshot,
    })),
  }
}
