import { useEffect, useMemo, useState } from 'react'

import type { ScheduleClass } from '../../types/schedule'
import { buildTeacherSchedule } from '../../utils/schedule'
import { CohortScheduleTable } from './CohortScheduleTable'
import { TeacherScheduleTable } from './TeacherScheduleTable'

interface Props {
  schedule: ScheduleClass[]
  blocks: string[]
}

type Mode = 'class' | 'teacher'

export function ScheduleGrid({ schedule, blocks }: Props) {
  const sorted = useMemo(() => [...schedule].sort((a, b) => a.name.localeCompare(b.name)), [schedule])
  const [mode, setMode] = useState<Mode>('class')
  const [selectedName, setSelectedName] = useState(sorted[0]?.name ?? '')

  const teachers = useMemo(() => {
    const names = new Set<string>()
    for (const cls of schedule) {
      for (const cohort of cls.cohorts) {
        for (const day of cohort.schedule) {
          for (const block of day.blocks) {
            if (block.teacher) names.add(block.teacher)
          }
        }
      }
    }
    return [...names].sort()
  }, [schedule])

  const [selectedTeacher, setSelectedTeacher] = useState(teachers[0] ?? '')

  useEffect(() => {
    setSelectedTeacher(teachers[0] ?? '')
  }, [teachers])

  useEffect(() => {
    setSelectedName(sorted[0]?.name ?? '')
  }, [sorted])

  useEffect(() => {
    setMode('class')
  }, [schedule])

  const cls = sorted.find((c) => c.name === selectedName) ?? sorted[0]

  const teacherSlots = useMemo(
    () => (mode === 'teacher' ? buildTeacherSchedule(selectedTeacher, schedule, blocks) : null),
    [mode, selectedTeacher, schedule, blocks],
  )

  return (
    <div className="space-y-6">
      <div
        className="inline-flex rounded-lg p-0.5"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {(['class', 'teacher'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
            style={mode === m ? { backgroundColor: 'var(--brand)', color: '#ffffff' } : { color: 'var(--text-muted)' }}
          >
            {m === 'class' ? 'By Class' : 'By Teacher'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === 'class'
          ? sorted.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedName(c.name)}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                style={
                  c.name === (cls?.name ?? '')
                    ? {
                        backgroundColor: 'var(--brand)',
                        color: '#ffffff',
                        boxShadow: '0 1px 3px rgba(30,58,95,0.3)',
                      }
                    : {
                        backgroundColor: 'var(--surface)',
                        color: 'var(--brand)',
                        border: '1px solid var(--border)',
                      }
                }
              >
                {c.name}
              </button>
            ))
          : teachers.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTeacher(t)}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                style={
                  t === selectedTeacher
                    ? {
                        backgroundColor: 'var(--brand)',
                        color: '#ffffff',
                        boxShadow: '0 1px 3px rgba(30,58,95,0.3)',
                      }
                    : {
                        backgroundColor: 'var(--surface)',
                        color: 'var(--brand)',
                        border: '1px solid var(--border)',
                      }
                }
              >
                {t}
              </button>
            ))}
      </div>

      {mode === 'class' && cls && (
        <div className="space-y-8">
          {cls.cohorts.map((cohort) => (
            <div key={cohort.name}>
              {cls.cohorts.length > 1 && (
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
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

      {mode === 'teacher' && teacherSlots && <TeacherScheduleTable slots={teacherSlots} blocks={blocks} />}
    </div>
  )
}
