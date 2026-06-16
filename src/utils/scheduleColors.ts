export const SUBJECT_PALETTE = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#e11d48',
  '#7c3aed',
  '#db2777',
  '#4338ca',
  '#ea580c',
  '#0d9488',
]

export function subjectAccent(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length]
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
