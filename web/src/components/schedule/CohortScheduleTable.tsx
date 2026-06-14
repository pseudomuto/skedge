import type { Cohort } from '../../types/schedule'

interface Props {
  cohort: Cohort
  blocks: string[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const SUBJECT_PALETTE = [
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#e11d48', // rose
  '#7c3aed', // violet
  '#db2777', // pink
  '#4338ca', // indigo
  '#ea580c', // orange
  '#0d9488', // teal
]

function subjectAccent(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length]
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function CohortScheduleTable({ cohort, blocks }: Props) {
  const byDay = Object.fromEntries(
    cohort.schedule.map(ds => [ds.day, ds.blocks]),
  )

  return (
    <div
      className="overflow-x-auto rounded-xl shadow-sm"
      style={{ border: '1px solid var(--border)' }}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--brand)' }}>
            <th className="w-28 px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Block
            </th>
            {DAYS.map(day => (
              <th
                key={day}
                className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((label, idx) => (
            <tr
              key={idx}
              className="transition-colors"
              style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)' }}
            >
              <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {label}
              </td>
              {DAYS.map(day => {
                const block = byDay[day]?.[idx]
                if (!block?.name) {
                  return <td key={day} className="px-4 py-2.5" />
                }
                const color = subjectAccent(block.name)
                return (
                  <td key={day} className="px-3 py-2">
                    <div
                      className="rounded-md px-3 py-2"
                      style={{ backgroundColor: hexToRgba(color, 0.1) }}
                    >
                      <div className="text-xs font-semibold leading-snug" style={{ color }}>
                        {block.name}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                        {block.teacher} · {block.room}
                      </div>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
