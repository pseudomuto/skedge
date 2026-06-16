import { describe, expect, it } from 'vitest'

import type { ScheduleClass } from '../../types/schedule'
import { buildTeacherSchedule } from '../../utils/schedule'

const BLOCKS = ['8:00', '9:00']

function emptyBlocks() {
  return [
    { name: '', teacher: '', room: '' },
    { name: '', teacher: '', room: '' },
  ]
}

function emptyWeek(overrides: Record<string, { name: string; teacher: string; room: string }[]> = {}) {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
    day,
    blocks: overrides[day] ?? emptyBlocks(),
  }))
}

describe('buildTeacherSchedule', () => {
  it('returns null for all slots when teacher has no assignments', () => {
    const schedule: ScheduleClass[] = [{ name: 'Grade 7', cohorts: [{ name: 'A', schedule: emptyWeek() }] }]
    const result = buildTeacherSchedule('Smith', schedule, BLOCKS)
    expect(result.every((row) => row.every((slot) => slot === null))).toBe(true)
  })

  it('returns slot with no cohortName for a single-cohort class', () => {
    const schedule: ScheduleClass[] = [
      {
        name: 'Grade 7',
        cohorts: [
          {
            name: 'A',
            schedule: emptyWeek({
              Monday: [
                { name: 'Math', teacher: 'Smith', room: '101' },
                { name: '', teacher: '', room: '' },
              ],
            }),
          },
        ],
      },
    ]
    const result = buildTeacherSchedule('Smith', schedule, BLOCKS)
    expect(result[0][0]).toEqual({ subject: 'Math', className: 'Grade 7' })
    expect(result[0][0]?.cohortName).toBeUndefined()
  })

  it('returns slot with cohortName for a multi-cohort class', () => {
    const schedule: ScheduleClass[] = [
      {
        name: 'Grade 7',
        cohorts: [
          {
            name: 'A',
            schedule: emptyWeek({
              Monday: [
                { name: 'Math', teacher: 'Smith', room: '101' },
                { name: '', teacher: '', room: '' },
              ],
            }),
          },
          { name: 'B', schedule: emptyWeek() },
        ],
      },
    ]
    const result = buildTeacherSchedule('Smith', schedule, BLOCKS)
    expect(result[0][0]).toEqual({ subject: 'Math', className: 'Grade 7', cohortName: 'A' })
  })

  it('collects assignments across multiple classes', () => {
    const schedule: ScheduleClass[] = [
      {
        name: 'Grade 7',
        cohorts: [
          {
            name: 'A',
            schedule: emptyWeek({
              Monday: [
                { name: 'Math', teacher: 'Smith', room: '101' },
                { name: '', teacher: '', room: '' },
              ],
            }),
          },
        ],
      },
      {
        name: 'Grade 8',
        cohorts: [
          {
            name: 'A',
            schedule: emptyWeek({
              Monday: [
                { name: '', teacher: '', room: '' },
                { name: 'Science', teacher: 'Smith', room: '102' },
              ],
            }),
          },
        ],
      },
    ]
    const result = buildTeacherSchedule('Smith', schedule, BLOCKS)
    expect(result[0][0]).toEqual({ subject: 'Math', className: 'Grade 7' })
    expect(result[1][0]).toEqual({ subject: 'Science', className: 'Grade 8' })
  })
})
