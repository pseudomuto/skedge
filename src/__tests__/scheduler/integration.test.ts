import { describe, expect, it } from 'vitest'

import { generate, validate } from '../../scheduler/index'
import type { Config } from '../../types/config'

const minimalConfig: Config = {
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

const demoConfig: Config = {
  blocks: ['1 (8:55)', '2 (9:55)', '3 (11:35)', '4 (12:35)', '5 (2:15)'],
  subjects: [
    { name: 'Art' },
    { name: 'English' },
    { name: 'French' },
    { name: 'Hist/Geo' },
    { name: 'Math' },
    { name: 'Music' },
    { name: 'PE/H' },
    { name: 'Science' },
  ],
  classes: [
    {
      name: 'EMF8',
      cohorts: ['EMF8A', 'EMF8B', 'EMF8C', 'EMF8D', 'EMF8E'],
      subjects: [
        { name: 'Art', blocks: 1 },
        { name: 'English', blocks: 5 },
        { name: 'French', blocks: 4 },
        { name: 'Hist/Geo', blocks: 2 },
        { name: 'Math', blocks: 5 },
        { name: 'Music', blocks: 2 },
        { name: 'PE/H', blocks: 3 },
        { name: 'Science', blocks: 3 },
      ],
    },
  ],
  teachers: [
    {
      name: 'Bernier',
      room: '357',
      subjects: [{ class: 'EMF8', subjects: ['Art', 'French', 'Hist/Geo', 'Science'] }],
    },
    {
      name: 'Campbell',
      room: '355',
      subjects: [{ class: 'EMF8', subjects: ['English', 'Math'] }],
    },
    {
      name: 'Gumaste',
      room: '176',
      subjects: [{ class: 'EMF8', subjects: ['Music'] }],
    },
    {
      name: 'Landry',
      room: 'Outdoor',
      subjects: [{ class: 'EMF8', subjects: ['PE/H'] }],
    },
    {
      name: 'MacDonald',
      room: '358',
      subjects: [{ class: 'EMF8', subjects: ['English', 'Math'] }],
    },
    {
      name: 'Miller',
      room: '365',
      subjects: [{ class: 'EMF8', subjects: ['Art', 'French', 'Hist/Geo', 'Science'] }],
    },
    {
      name: 'Savoie',
      room: '362',
      subjects: [{ class: 'EMF8', subjects: ['French', 'Hist/Geo', 'PE/H', 'Science'] }],
    },
    {
      name: 'Xidous',
      room: '354',
      subjects: [{ class: 'EMF8', subjects: ['Art', 'English', 'Math'] }],
    },
  ],
}

const multiCohortConfig: Config = {
  blocks: ['09:00', '10:00', '11:00'],
  subjects: [{ name: 'Math' }, { name: 'English' }, { name: 'Science' }],
  classes: [
    {
      name: 'Grade8',
      cohorts: ['8A', '8B'],
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
    {
      name: 'Jones',
      room: '102',
      subjects: [{ class: 'Grade8', subjects: ['Math', 'English', 'Science'] }],
    },
  ],
}

describe('TestGenerate', () => {
  it('generates a valid schedule 5 times for minimal config', () => {
    for (let i = 0; i < 5; i++) {
      const result = generate(minimalConfig, 100, undefined, i + 1)
      expect(result.ok, `attempt ${i}: expected ok but got error`).toBe(true)
      if (result.ok) {
        const err = validate(minimalConfig, result.value)
        expect(err, `attempt ${i}: validate failed: ${err?.message}`).toBeNull()
      }
    }
  })
})

describe('TestGenerate_demoConfig', () => {
  it('generates a valid schedule for the demo config', () => {
    const result = generate(demoConfig, 200)
    expect(result.ok, `expected ok but got: ${!result.ok ? result.error : ''}`).toBe(true)
    if (result.ok) {
      const err = validate(demoConfig, result.value)
      expect(err, `validate failed: ${err?.message}`).toBeNull()
    }
  })
})

describe('TestGenerate_multiCohortContention', () => {
  it('generates a valid schedule 5 times with 2 cohorts sharing 2 teachers', () => {
    for (let i = 0; i < 5; i++) {
      const result = generate(multiCohortConfig, 100, undefined, i + 1)
      expect(result.ok, `attempt ${i}: expected ok but got error`).toBe(true)
      if (result.ok) {
        const err = validate(multiCohortConfig, result.value)
        expect(err, `attempt ${i}: validate failed: ${err?.message}`).toBeNull()
      }
    }
  })
})
