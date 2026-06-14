import type { Cohort } from '../../types/schedule'

interface Props {
  cohort: Cohort
  blocks: string[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_LABELS: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
}

function subjectColor(name: string): string {
  const colors = [
    'bg-blue-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-red-100',
    'bg-purple-100',
    'bg-pink-100',
    'bg-indigo-100',
    'bg-orange-100',
    'bg-teal-100',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export function CohortScheduleTable({ cohort, blocks }: Props) {
  const byDay = Object.fromEntries(
    cohort.schedule.map(ds => [ds.day, ds.blocks]),
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
              Block
            </th>
            {DAYS.map(day => (
              <th
                key={day}
                className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600"
              >
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((label, idx) => (
            <tr key={idx}>
              <td className="border border-gray-200 px-3 py-2 text-gray-500 whitespace-nowrap">
                {label}
              </td>
              {DAYS.map(day => {
                const block = byDay[day]?.[idx]
                if (!block) {
                  return (
                    <td key={day} className="border border-gray-200 px-3 py-2" />
                  )
                }
                return (
                  <td
                    key={day}
                    className={`border border-gray-200 px-3 py-2 text-sm ${subjectColor(block.name)}`}
                  >
                    {block.name} ({block.teacher}-{block.room})
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
