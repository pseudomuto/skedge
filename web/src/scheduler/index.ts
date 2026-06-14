import type { Config } from '../types/config'
import type { Block, Cohort, DailySchedule, ScheduleClass } from '../types/schedule'

import { phase1 } from './phase1'
import { phase2 } from './phase2'
import { validate } from './validate'

export { validate } from './validate'

export type GenerateResult = { ok: true; value: ScheduleClass[] } | { ok: false; error: string }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DEFAULT_MAX_RETRIES = 100

function makePrng(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0
    s ^= s >>> 16
    return (s >>> 0) / 0xffffffff
  }
}

function buildEmptySchedule(cfg: Config): ScheduleClass[] {
  return cfg.classes.map((cls) => ({
    name: cls.name,
    cohorts: cls.cohorts.map(
      (cohortName): Cohort => ({
        name: cohortName,
        schedule: DAYS.map(
          (day): DailySchedule => ({
            day,
            blocks: cfg.blocks.map((): Block => ({ name: '', teacher: '', room: '' })),
          }),
        ),
      }),
    ),
  }))
}

export function generate(
  config: Config,
  maxRetries = DEFAULT_MAX_RETRIES,
  onProgress?: (attempt: number) => void,
  seed?: number,
): GenerateResult {
  const rng = seed !== undefined ? makePrng(seed) : () => Math.random()

  for (let i = 0; i < maxRetries; i++) {
    onProgress?.(i)
    const schedule = buildEmptySchedule(config)
    if (phase1(config, schedule, rng)) continue
    if (phase2(config, schedule, rng)) continue
    if (validate(config, schedule)) continue
    return { ok: true, value: schedule }
  }
  return { ok: false, error: `could not generate a valid schedule after ${maxRetries} attempts` }
}
