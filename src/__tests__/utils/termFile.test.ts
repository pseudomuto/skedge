import { describe, expect, it } from 'vitest'

import type { TermExport } from '../../types/term'
import { parseTermExport } from '../../utils/termFile'

const validExport: TermExport = {
  version: 1,
  name: 'Fall 2025',
  exportedAt: 1000000,
  config: null,
  schedules: [],
}

describe('parseTermExport', () => {
  it('parses a valid term export JSON string', () => {
    const result = parseTermExport(JSON.stringify(validExport))
    expect(result).toEqual(validExport)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseTermExport('not json')).toThrow('Invalid JSON file')
  })

  it('throws when version is not 1', () => {
    const data = { ...validExport, version: 2 }
    expect(() => parseTermExport(JSON.stringify(data))).toThrow('Invalid term export file')
  })

  it('throws when name is missing', () => {
    const data = { version: 1 as const, exportedAt: 1000000, config: null, schedules: [] }
    expect(() => parseTermExport(JSON.stringify(data))).toThrow('Invalid term export file')
  })

  it('throws when schedules is not an array', () => {
    const data = { ...validExport, schedules: null }
    expect(() => parseTermExport(JSON.stringify(data))).toThrow('Invalid term export file')
  })
})
