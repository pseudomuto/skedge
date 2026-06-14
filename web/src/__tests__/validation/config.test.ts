import { describe, it, expect } from 'vitest'
import type { Config } from '../../types/config'
import { validateConfig } from '../../validation/config'

function baseConfig(): Config {
  return {
    blocks: ['09:00', '10:00', '11:00'],
    subjects: [{ name: 'Math' }, { name: 'English' }],
    classes: [
      {
        name: 'Grade8',
        cohorts: ['8A', '8B'],
        subjects: [
          { name: 'Math', blocks: 3 },
          { name: 'English', blocks: 2 },
        ],
      },
    ],
    teachers: [
      {
        name: 'Smith',
        room: '101',
        subjects: [{ class: 'Grade8', subjects: ['Math', 'English'] }],
      },
    ],
  }
}

describe('validateConfig', () => {
  it('returns no errors for a valid config', () => {
    expect(validateConfig(baseConfig())).toEqual([])
  })

  describe('blocks', () => {
    const cases = [
      {
        name: 'empty string is invalid',
        blocks: ['09:00', '', '11:00'],
        expectPath: 'blocks[1]',
        expectMsg: 'is required',
      },
      {
        name: 'duplicate value is invalid',
        blocks: ['09:00', '10:00', '09:00'],
        expectPath: 'blocks[2]',
        expectMsg: 'contains duplicate value: 09:00',
      },
    ]

    cases.forEach(({ name, blocks, expectPath, expectMsg }) => {
      it(name, () => {
        const cfg = { ...baseConfig(), blocks }
        const errors = validateConfig(cfg)
        expect(errors.some(e => e.path === expectPath && e.message === expectMsg)).toBe(true)
      })
    })

    it('accumulates multiple errors', () => {
      const cfg = { ...baseConfig(), blocks: ['', '09:00', '09:00'] }
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'blocks[0]')).toBe(true)
      expect(errors.some(e => e.path === 'blocks[2]')).toBe(true)
    })
  })

  describe('subjects', () => {
    it('requires name', () => {
      const cfg = baseConfig()
      cfg.subjects = [{ name: 'Math' }, { name: '' }]
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'subjects[1].name' && e.message === 'is required')).toBe(true)
    })
  })

  describe('classes', () => {
    it('requires name', () => {
      const cfg = baseConfig()
      cfg.classes[0].name = ''
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'classes[0].name' && e.message === 'is required')).toBe(true)
    })

    it('rejects duplicate cohorts', () => {
      const cfg = baseConfig()
      cfg.classes[0].cohorts = ['8A', '8A']
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'classes[0].cohorts')).toBe(true)
    })

    describe('class subjects', () => {
      const subjectCases = [
        {
          name: 'rejects unknown subject name',
          subject: { name: 'Art', blocks: 3 },
          expectPath: 'classes[0].subjects[0].name',
          expectMsg: 'unknown subject: Art',
        },
        {
          name: 'rejects zero blocks',
          subject: { name: 'Math', blocks: 0 },
          expectPath: 'classes[0].subjects[0].blocks',
          expectMsg: 'must be greater than 0',
        },
        {
          name: 'rejects negative blocks',
          subject: { name: 'Math', blocks: -1 },
          expectPath: 'classes[0].subjects[0].blocks',
          expectMsg: 'must be greater than 0',
        },
      ]

      subjectCases.forEach(({ name, subject, expectPath, expectMsg }) => {
        it(name, () => {
          const cfg = baseConfig()
          cfg.classes[0].subjects = [subject]
          const errors = validateConfig(cfg)
          expect(errors.some(e => e.path === expectPath && e.message === expectMsg)).toBe(true)
        })
      })
    })

    it('indexes correctly for later classes', () => {
      const cfg = baseConfig()
      cfg.classes.push({ name: '', cohorts: [], subjects: [] })
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'classes[1].name')).toBe(true)
    })
  })

  describe('teachers', () => {
    const teacherCases = [
      {
        name: 'requires name',
        teacher: { name: '', room: '101', subjects: [] },
        expectPath: 'teachers[0].name',
        expectMsg: 'is required',
      },
      {
        name: 'requires room',
        teacher: { name: 'Smith', room: '', subjects: [] },
        expectPath: 'teachers[0].room',
        expectMsg: 'is required',
      },
    ]

    teacherCases.forEach(({ name, teacher, expectPath, expectMsg }) => {
      it(name, () => {
        const cfg = baseConfig()
        cfg.teachers = [teacher]
        const errors = validateConfig(cfg)
        expect(errors.some(e => e.path === expectPath && e.message === expectMsg)).toBe(true)
      })
    })

    describe('teacher subjects', () => {
      it('rejects unknown class', () => {
        const cfg = baseConfig()
        cfg.teachers[0].subjects = [{ class: 'Unknown', subjects: ['Math'] }]
        const errors = validateConfig(cfg)
        expect(
          errors.some(
            e => e.path === 'teachers[0].subjects[0].class' && e.message === 'unknown class: Unknown',
          ),
        ).toBe(true)
      })

      it('rejects unknown subject', () => {
        const cfg = baseConfig()
        cfg.teachers[0].subjects = [{ class: 'Grade8', subjects: ['Art'] }]
        const errors = validateConfig(cfg)
        expect(
          errors.some(
            e =>
              e.path === 'teachers[0].subjects[0].subjects[0]' &&
              e.message === 'unknown subject: Art',
          ),
        ).toBe(true)
      })

      it('indexes correctly for later teacher subjects', () => {
        const cfg = baseConfig()
        cfg.teachers[0].subjects = [
          { class: 'Grade8', subjects: ['Math'] },
          { class: 'Nonexistent', subjects: [] },
        ]
        const errors = validateConfig(cfg)
        expect(errors.some(e => e.path === 'teachers[0].subjects[1].class')).toBe(true)
      })
    })

    it('indexes correctly for later teachers', () => {
      const cfg = baseConfig()
      cfg.teachers.push({ name: 'Jones', room: '', subjects: [] })
      const errors = validateConfig(cfg)
      expect(errors.some(e => e.path === 'teachers[1].room')).toBe(true)
    })
  })

  it('accumulates all errors rather than stopping at first', () => {
    const cfg: Config = {
      blocks: ['', '09:00', '09:00'],
      subjects: [{ name: '' }],
      classes: [{ name: '', cohorts: [], subjects: [{ name: 'Unknown', blocks: 0 }] }],
      teachers: [{ name: '', room: '', subjects: [] }],
    }
    const errors = validateConfig(cfg)
    expect(errors.length).toBeGreaterThan(4)
  })
})
