import type { TermExport } from '../types/term'

export function parseTermExport(text: string): TermExport {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file')
  }
  const obj = parsed as Record<string, unknown>
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    obj.version !== 1 ||
    typeof obj.name !== 'string' ||
    !Array.isArray(obj.schedules)
  ) {
    throw new Error('Invalid term export file')
  }
  return parsed as TermExport
}

export function downloadTerm(data: TermExport): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.name}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
