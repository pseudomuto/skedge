import { DAYS, type TeacherSlot } from '../../utils/schedule'
import { hexToRgba, subjectAccent } from '../../utils/scheduleColors'

interface Props {
  slots: (TeacherSlot | null)[][]
  blocks: string[]
}

export function TeacherScheduleTable({ slots, blocks }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl shadow-sm" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--brand)' }}>
            <th className="w-28 px-4 py-3 text-left text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Block
            </th>
            {DAYS.map((day) => (
              <th key={day} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((label, blockIdx) => (
            <tr
              key={blockIdx}
              className="transition-colors"
              style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)'
              }}
            >
              <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {label}
              </td>
              {DAYS.map((_, dayIdx) => {
                const slot = slots[blockIdx]?.[dayIdx]
                if (!slot) {
                  return <td key={dayIdx} className="px-4 py-2.5" />
                }
                const color = subjectAccent(slot.subject)
                const classLabel = slot.cohortName ? `${slot.className} - ${slot.cohortName}` : slot.className
                return (
                  <td key={dayIdx} className="px-3 py-2">
                    <div className="rounded-md px-3 py-2" style={{ backgroundColor: hexToRgba(color, 0.1) }}>
                      <div className="text-xs font-semibold leading-snug" style={{ color }}>
                        {slot.subject}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                        {classLabel}
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
