import { useEffect } from 'react'
import type { Config } from '../../types/config'
import type { ScheduleClass } from '../../types/schedule'
import { useScheduler } from '../../hooks/useScheduler'
import { saveSchedule } from '../../db/queries'

interface Props {
  config: Config | null
  onScheduleGenerated: (schedule: ScheduleClass[]) => void
}

export function GenerateButton({ config, onScheduleGenerated }: Props) {
  const scheduler = useScheduler()
  const { status, schedule, error, progress } = scheduler

  const isDisabled = config === null || config.classes.length === 0

  useEffect(() => {
    if (status === 'success' && schedule && config) {
      saveSchedule(schedule, config)
      onScheduleGenerated(schedule)
    }
  }, [status, schedule, config, onScheduleGenerated])

  const handleClick = () => {
    if (!config) return
    scheduler.generate(config, 100)
  }

  const buttonLabel = status === 'running' ? 'Generating...' : status === 'error' ? 'Try again' : 'Generate schedule'

  const pct = progress ? Math.round((progress.attempt / progress.maxAttempts) * 100) : 0

  const buttonDisabled = isDisabled || status === 'running'

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={buttonDisabled}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: buttonDisabled ? 'var(--text-muted)' : 'var(--accent)',
        }}
        onMouseEnter={(e) => {
          if (!buttonDisabled) {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = '#a86a12'
          }
        }}
        onMouseLeave={(e) => {
          if (!buttonDisabled) {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)'
          }
        }}
      >
        {buttonLabel}
      </button>

      {status === 'running' && (
        <div className="space-y-1.5">
          <div className="h-1 w-64 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
          {progress && (
            <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              attempt {progress.attempt} of {progress.maxAttempts}
            </p>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <p className="text-sm" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
    </div>
  )
}
