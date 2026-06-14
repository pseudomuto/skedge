import { describe, expect, it } from 'vitest'

import type { Config } from '../../types/config'
import type { Block, DailySchedule, Cohort, ScheduleClass } from '../../types/schedule'

import {
  validate,
  validateNoGaps,
  validateNoDuplicateSubjectPerDay,
  validateNoRoomConflict,
  validateNoTeacherConflict,
  validateSubjectBlockCounts,
  validateTeacherBlockLimit,
  validateTeacherSubjects,
  MAX_TEACHER_BLOCKS_PER_WEEK,
} from '../../scheduler/validate'

function blk(name: string, teacher: string, room: string): Block {
  return { name, teacher, room }
}

function testDay(day: string, ...blocks: Block[]): DailySchedule {
  return { day, blocks }
}

function testCohort(name: string, ...schedule: DailySchedule[]): Cohort {
  return { name, schedule }
}

function testClass(name: string, ...cohorts: Cohort[]): ScheduleClass {
  return { name, cohorts }
}

function weekFor(...blocks: Block[]): DailySchedule[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
    day,
    blocks: blocks.map(b => ({ ...b })),
  }))
}

function validSchedule(): ScheduleClass[] {
  return [
    testClass(
      'Grade8',
      testCohort('8A', ...weekFor(
        blk('Math', 'Smith', '101'),
        blk('English', 'Smith', '101'),
        blk('Science', 'Smith', '101'),
      )),
    ),
  ]
}

function baseValidatorConfig(): Config {
  return {
    blocks: ['09:00', '10:00', '11:00'],
    subjects: [{ name: 'Math' }, { name: 'English' }, { name: 'Science' }],
    classes: [
      {
        name: 'Grade8',
        cohorts: ['8A'],
        subjects: [
          { name: 'Math', blocks: 5 },
          { name: 'English', blocks: 5 },
          { name: 'Science', blocks: 5 },
        ],
      },
    ],
    teachers: [
      {
        name: 'Smith',
        room: '101',
        subjects: [{ class: 'Grade8', subjects: ['Math', 'English', 'Science'] }],
      },
    ],
  }
}

describe('validateNoTeacherConflict', () => {
  it('passes for a valid schedule', () => {
    expect(validateNoTeacherConflict(validSchedule())).toBeNull()
  })

  it('catches same teacher in two cohorts at same slot', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort('8A', testDay('Monday', blk('Math', 'Smith', '101'))),
        testCohort('8B', testDay('Monday', blk('English', 'Smith', '102'))),
      ),
    ]
    const err = validateNoTeacherConflict(schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Smith')
    expect(err!.message).toContain('double-booked')
  })
})

describe('validateNoRoomConflict', () => {
  it('passes for a valid schedule', () => {
    expect(validateNoRoomConflict(validSchedule())).toBeNull()
  })

  it('catches same room used by two cohorts in the same slot', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort('8A', testDay('Monday', blk('Math', 'Smith', '101'))),
        testCohort('8B', testDay('Monday', blk('English', 'Jones', '101'))),
      ),
    ]
    const err = validateNoRoomConflict(schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('101')
    expect(err!.message).toContain('double-booked')
  })
})

describe('validateTeacherBlockLimit', () => {
  function buildWithSmithBlocks(count: number): ScheduleClass[] {
    const blocks: Block[] = []
    for (let i = 0; i < count; i++) {
      blocks.push(blk(`Subject${i}`, 'Smith', '101'))
    }
    // Distribute across 5 days, up to 5 blocks per day (25 total capacity)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const schedule: DailySchedule[] = []
    let idx = 0
    for (const day of days) {
      const dayBlocks: Block[] = []
      for (let b = 0; b < 5 && idx < count; b++, idx++) {
        dayBlocks.push(blocks[idx])
      }
      if (dayBlocks.length > 0) schedule.push(testDay(day, ...dayBlocks))
    }
    return [testClass('Grade8', testCohort('8A', ...schedule))]
  }

  it(`passes for exactly ${MAX_TEACHER_BLOCKS_PER_WEEK} blocks`, () => {
    expect(validateTeacherBlockLimit(buildWithSmithBlocks(MAX_TEACHER_BLOCKS_PER_WEEK))).toBeNull()
  })

  it(`fails for ${MAX_TEACHER_BLOCKS_PER_WEEK + 1} blocks`, () => {
    const err = validateTeacherBlockLimit(buildWithSmithBlocks(MAX_TEACHER_BLOCKS_PER_WEEK + 1))
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Smith')
    expect(err!.message).toContain('exceeds weekly limit')
  })
})

describe('validateNoDuplicateSubjectPerDay', () => {
  it('passes for a valid schedule', () => {
    expect(validateNoDuplicateSubjectPerDay(validSchedule())).toBeNull()
  })

  it('catches Math appearing twice on Monday', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay('Monday', blk('Math', 'Smith', '101'), blk('Math', 'Smith', '101')),
        ),
      ),
    ]
    const err = validateNoDuplicateSubjectPerDay(schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Math')
    expect(err!.message).toContain('Monday')
  })
})

describe('validateTeacherSubjects', () => {
  it('passes for a valid schedule', () => {
    expect(validateTeacherSubjects(baseValidatorConfig(), validSchedule())).toBeNull()
  })

  it('catches teacher teaching unauthorized subject', () => {
    const cfg = baseValidatorConfig()
    const schedule = [
      testClass(
        'Grade8',
        testCohort('8A', testDay('Monday', blk('Art', 'Smith', '101'))),
      ),
    ]
    const err = validateTeacherSubjects(cfg, schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Smith')
    expect(err!.message).toContain('Art')
  })

  it('catches teacher not in config for a class', () => {
    const cfg = baseValidatorConfig()
    const schedule = [
      testClass(
        'Grade8',
        testCohort('8A', testDay('Monday', blk('Math', 'Unknown', '101'))),
      ),
    ]
    const err = validateTeacherSubjects(cfg, schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Unknown')
    expect(err!.message).toContain('no subjects authorized')
  })
})

describe('validateSubjectBlockCounts', () => {
  it('passes when counts match exactly', () => {
    expect(validateSubjectBlockCounts(baseValidatorConfig(), validSchedule())).toBeNull()
  })

  it('fails when a subject has too many blocks', () => {
    const cfg = baseValidatorConfig()
    // 6 Math blocks instead of 5
    const schedule = [
      testClass(
        'Grade8',
        testCohort('8A', ...weekFor(
          blk('Math', 'Smith', '101'),
          blk('English', 'Smith', '101'),
          blk('Science', 'Smith', '101'),
        ), testDay('Extra', blk('Math', 'Smith', '101'))),
      ),
    ]
    const err = validateSubjectBlockCounts(cfg, schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Math')
  })

  it('fails when a subject has too few blocks', () => {
    const cfg = baseValidatorConfig()
    // Only 4 days of Math (missing one day)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          ...days.map((day, i) =>
            testDay(
              day,
              i === 0
                ? blk('English', 'Smith', '101') // Monday: Math replaced with English
                : blk('Math', 'Smith', '101'),
              blk('English', 'Smith', '101'),
              blk('Science', 'Smith', '101'),
            ),
          ),
        ),
      ),
    ]
    const err = validateSubjectBlockCounts(cfg, schedule)
    expect(err).not.toBeNull()
    // Math will be 4 instead of 5, English will be 6 instead of 5
  })

  it('fails for an unknown subject', () => {
    // Config requires exactly 1 block each of Math/English/Science across all days.
    // The schedule satisfies those counts but adds an extra Art block - Art is not in config.
    const cfg: Config = {
      blocks: ['09:00', '10:00', '11:00', '11:30'],
      subjects: [{ name: 'Math' }, { name: 'English' }, { name: 'Science' }],
      classes: [
        {
          name: 'Grade8',
          cohorts: ['8A'],
          subjects: [
            { name: 'Math', blocks: 1 },
            { name: 'English', blocks: 1 },
            { name: 'Science', blocks: 1 },
          ],
        },
      ],
      teachers: [
        {
          name: 'Smith',
          room: '101',
          subjects: [{ class: 'Grade8', subjects: ['Math', 'English', 'Science'] }],
        },
      ],
    }
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay(
            'Monday',
            blk('Math', 'Smith', '101'),
            blk('English', 'Smith', '101'),
            blk('Science', 'Smith', '101'),
            blk('Art', 'Smith', '101'),
          ),
        ),
      ),
    ]
    const err = validateSubjectBlockCounts(cfg, schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('Art')
  })
})

describe('validateNoGaps', () => {
  it('passes for a valid schedule', () => {
    expect(validateNoGaps(baseValidatorConfig(), validSchedule())).toBeNull()
  })

  it('fails when a day has a missing block', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay('Monday', blk('Math', 'Smith', '101'), blk('English', 'Smith', '101')),
        ),
      ),
    ]
    const err = validateNoGaps(baseValidatorConfig(), schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('expected 3')
  })

  it('fails when a block has an empty subject', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay(
            'Monday',
            blk('', 'Smith', '101'),
            blk('English', 'Smith', '101'),
            blk('Science', 'Smith', '101'),
          ),
        ),
      ),
    ]
    const err = validateNoGaps(baseValidatorConfig(), schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('empty field')
  })

  it('fails when a block has an empty teacher', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay(
            'Monday',
            blk('Math', '', '101'),
            blk('English', 'Smith', '101'),
            blk('Science', 'Smith', '101'),
          ),
        ),
      ),
    ]
    const err = validateNoGaps(baseValidatorConfig(), schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('empty field')
  })

  it('fails when a block has an empty room', () => {
    const schedule = [
      testClass(
        'Grade8',
        testCohort(
          '8A',
          testDay(
            'Monday',
            blk('Math', 'Smith', ''),
            blk('English', 'Smith', '101'),
            blk('Science', 'Smith', '101'),
          ),
        ),
      ),
    ]
    const err = validateNoGaps(baseValidatorConfig(), schedule)
    expect(err).not.toBeNull()
    expect(err!.message).toContain('empty field')
  })
})

describe('validate', () => {
  it('passes for a fully valid schedule', () => {
    expect(validate(baseValidatorConfig(), validSchedule())).toBeNull()
  })
})
