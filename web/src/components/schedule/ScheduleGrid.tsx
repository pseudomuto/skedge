import { useState } from 'react'
import type { ScheduleClass } from '../../types/schedule'
import { CohortScheduleTable } from './CohortScheduleTable'

interface Props {
  schedule: ScheduleClass[]
  blocks: string[]
}

export function ScheduleGrid({ schedule, blocks }: Props) {
  const [selectedClass, setSelectedClass] = useState(0)

  const cls = schedule[selectedClass]

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
          Class
        </label>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {schedule.map((c, i) => (
            <option key={c.name} value={i}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {cls && (
        <div className="space-y-6">
          {cls.cohorts.map(cohort => (
            <div key={cohort.name}>
              {cls.cohorts.length > 1 && (
                <h3 className="mb-2 text-sm font-medium text-gray-600">
                  Cohort {cohort.name}
                </h3>
              )}
              <CohortScheduleTable cohort={cohort} blocks={blocks} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
