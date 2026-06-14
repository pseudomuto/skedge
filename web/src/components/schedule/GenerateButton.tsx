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

  const buttonLabel = status === 'running'
    ? 'Generating...'
    : status === 'error'
    ? 'Retry'
    : 'Generate Schedule'

  const pct = progress
    ? Math.round((progress.attempt / progress.maxAttempts) * 100)
    : 0

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isDisabled || status === 'running'}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {status === 'running' && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress && (
            <p className="text-xs text-gray-500">
              attempt {progress.attempt} of {progress.maxAttempts}
            </p>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
