import { useState } from 'react'
import type { ScheduleClass } from '../../types/schedule'
import { CohortScheduleTable } from './CohortScheduleTable'

interface Props {
  schedule: ScheduleClass[]
  blocks: string[]
}

export function ScheduleGrid({ schedule, blocks }: Props) {
  const sorted = [...schedule].sort((a, b) => a.name.localeCompare(b.name))
  const [selectedName, setSelectedName] = useState(sorted[0]?.name ?? '')

  const cls = sorted.find(c => c.name === selectedName) ?? sorted[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {sorted.map(c => (
          <button
            key={c.name}
            onClick={() => setSelectedName(c.name)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
            style={
              c.name === (cls?.name ?? '')
                ? { backgroundColor: 'var(--brand)', color: '#ffffff', boxShadow: '0 1px 3px rgba(30,58,95,0.3)' }
                : { backgroundColor: 'var(--surface)', color: 'var(--brand)', border: '1px solid var(--border)' }
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      {cls && (
        <div className="space-y-8">
          {cls.cohorts.map(cohort => (
            <div key={cohort.name}>
              {cls.cohorts.length > 1 && (
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--brand)' }}
                  >
                    {'Cohort ' + cohort.name}
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
                </div>
              )}
              <CohortScheduleTable cohort={cohort} blocks={blocks} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
