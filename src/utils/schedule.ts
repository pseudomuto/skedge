import type { ScheduleClass } from '../types/schedule'

export interface TeacherSlot {
  subject: string
  className: string
  cohortName?: string
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function buildTeacherSchedule(
  teacherName: string,
  schedule: ScheduleClass[],
  blocks: string[],
): (TeacherSlot | null)[][] {
  return blocks.map((_, blockIdx) =>
    DAYS.map((day) => {
      for (const cls of schedule) {
        for (const cohort of cls.cohorts) {
          const daily = cohort.schedule.find((ds) => ds.day === day)
          if (!daily) continue
          const block = daily.blocks[blockIdx]
          if (block?.teacher === teacherName) {
            return {
              subject: block.name,
              className: cls.name,
              cohortName: cls.cohorts.length > 1 ? cohort.name : undefined,
            }
          }
        }
      }
      return null
    }),
  )
}
