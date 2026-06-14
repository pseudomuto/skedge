import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'

export const MAX_TEACHER_BLOCKS_PER_WEEK = 21

export function validateNoTeacherConflict(schedule: ScheduleClass[]): Error | null {
  const seen = new Map<string, string>()
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        for (let i = 0; i < d.blocks.length; i++) {
          const b = d.blocks[i]
          const key = `${d.day}:${i}:${b.teacher}`
          const other = seen.get(key)
          if (other !== undefined) {
            return new Error(
              `teacher ${b.teacher} double-booked on ${d.day} block ${i}: cohorts ${other} and ${cohort.name}`,
            )
          }
          seen.set(key, cohort.name)
        }
      }
    }
  }
  return null
}

export function validateNoRoomConflict(schedule: ScheduleClass[]): Error | null {
  const seen = new Map<string, string>()
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        for (let i = 0; i < d.blocks.length; i++) {
          const b = d.blocks[i]
          const key = `${d.day}:${i}:${b.room}`
          const other = seen.get(key)
          if (other !== undefined) {
            return new Error(
              `room ${b.room} double-booked on ${d.day} block ${i}: cohorts ${other} and ${cohort.name}`,
            )
          }
          seen.set(key, cohort.name)
        }
      }
    }
  }
  return null
}

export function validateTeacherBlockLimit(schedule: ScheduleClass[]): Error | null {
  const counts = new Map<string, number>()
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        for (const b of d.blocks) {
          counts.set(b.teacher, (counts.get(b.teacher) ?? 0) + 1)
        }
      }
    }
  }
  for (const [teacher, count] of counts) {
    if (count > MAX_TEACHER_BLOCKS_PER_WEEK) {
      return new Error(
        `teacher ${teacher} has ${count} blocks, exceeds weekly limit of ${MAX_TEACHER_BLOCKS_PER_WEEK}`,
      )
    }
  }
  return null
}

export function validateNoDuplicateSubjectPerDay(schedule: ScheduleClass[]): Error | null {
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        const seen = new Set<string>()
        for (const b of d.blocks) {
          if (seen.has(b.name)) {
            return new Error(
              `cohort ${cohort.name} has subject ${b.name} more than once on ${d.day}`,
            )
          }
          seen.add(b.name)
        }
      }
    }
  }
  return null
}

export function validateTeacherSubjects(cfg: Config, schedule: ScheduleClass[]): Error | null {
  const authorized = new Map<string, Set<string>>()
  for (const t of cfg.teachers) {
    for (const ts of t.subjects) {
      const k = `${t.name}:${ts.class}`
      if (!authorized.has(k)) authorized.set(k, new Set())
      for (const s of ts.subjects) authorized.get(k)!.add(s)
    }
  }
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        for (const b of d.blocks) {
          const k = `${b.teacher}:${cls.name}`
          const subjects = authorized.get(k)
          if (!subjects) {
            return new Error(
              `teacher ${b.teacher} has no subjects authorized for class ${cls.name}`,
            )
          }
          if (!subjects.has(b.name)) {
            return new Error(
              `teacher ${b.teacher} not authorized to teach ${b.name} in class ${cls.name}`,
            )
          }
        }
      }
    }
  }
  return null
}

export function validateSubjectBlockCounts(cfg: Config, schedule: ScheduleClass[]): Error | null {
  const required = new Map<string, Map<string, number>>()
  for (const c of cfg.classes) {
    const m = new Map<string, number>()
    for (const s of c.subjects) m.set(s.name, s.blocks)
    required.set(c.name, m)
  }
  for (const cls of schedule) {
    const req = required.get(cls.name)
    if (!req) continue
    for (const cohort of cls.cohorts) {
      const actual = new Map<string, number>()
      for (const d of cohort.schedule) {
        for (const b of d.blocks) {
          actual.set(b.name, (actual.get(b.name) ?? 0) + 1)
        }
      }
      for (const [subject, want] of req) {
        const got = actual.get(subject) ?? 0
        if (got !== want) {
          return new Error(
            `cohort ${cohort.name} has ${got} blocks of ${subject}, expected ${want}`,
          )
        }
      }
      for (const [subject] of actual) {
        if (!req.has(subject)) {
          return new Error(`cohort ${cohort.name} has unknown subject ${subject}`)
        }
      }
    }
  }
  return null
}

export function validateNoGaps(cfg: Config, schedule: ScheduleClass[]): Error | null {
  const expected = cfg.blocks.length
  for (const cls of schedule) {
    for (const cohort of cls.cohorts) {
      for (const d of cohort.schedule) {
        if (d.blocks.length !== expected) {
          return new Error(
            `cohort ${cohort.name} on ${d.day} has ${d.blocks.length} blocks, expected ${expected}`,
          )
        }
        for (let i = 0; i < d.blocks.length; i++) {
          const b = d.blocks[i]
          if (!b.name || !b.teacher || !b.room) {
            return new Error(`cohort ${cohort.name} on ${d.day} block ${i} has empty field`)
          }
        }
      }
    }
  }
  return null
}

export function validate(cfg: Config, schedule: ScheduleClass[]): Error | null {
  const checks = [
    () => validateNoTeacherConflict(schedule),
    () => validateNoRoomConflict(schedule),
    () => validateTeacherBlockLimit(schedule),
    () => validateNoDuplicateSubjectPerDay(schedule),
    () => validateTeacherSubjects(cfg, schedule),
    () => validateSubjectBlockCounts(cfg, schedule),
    () => validateNoGaps(cfg, schedule),
  ]
  for (const check of checks) {
    const err = check()
    if (err) return err
  }
  return null
}
