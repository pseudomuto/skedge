import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'
import { db } from './schema'
import type { StoredSchedule } from './schema'

export async function getConfig(): Promise<Config | undefined> {
  const stored = await db.configs.get(1)
  return stored?.data
}

export async function saveConfig(data: Config): Promise<void> {
  await db.configs.put({ id: 1, data, updatedAt: Date.now() })
}

export async function listSchedules(): Promise<StoredSchedule[]> {
  return db.schedules.orderBy('generatedAt').reverse().toArray()
}

export async function saveSchedule(
  schedule: ScheduleClass[],
  config: Config,
  label?: string,
): Promise<number> {
  const generatedAt = Date.now()
  const resolvedLabel = label ?? new Date(generatedAt).toLocaleDateString()
  const id = await db.schedules.add({
    generatedAt,
    label: resolvedLabel,
    schedule,
    configSnapshot: config,
  })
  return id as number
}

export async function deleteSchedule(id: number): Promise<void> {
  await db.schedules.delete(id)
}
