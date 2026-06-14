import { useState, useRef, useEffect, useCallback } from 'react'
import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'

type SchedulerStatus = 'idle' | 'running' | 'success' | 'error'

type WorkerResponse =
  | { type: 'PROGRESS'; attempt: number; maxAttempts: number }
  | { type: 'SUCCESS'; schedule: ScheduleClass[] }
  | { type: 'ERROR'; message: string }

interface UseSchedulerReturn {
  generate: (config: Config, maxRetries?: number) => void
  status: SchedulerStatus
  schedule: ScheduleClass[] | null
  error: string | null
  progress: { attempt: number; maxAttempts: number } | null
}

export function useScheduler(): UseSchedulerReturn {
  const [status, setStatus] = useState<SchedulerStatus>('idle')
  const [schedule, setSchedule] = useState<ScheduleClass[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ attempt: number; maxAttempts: number } | null>(null)

  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const generate = useCallback((config: Config, maxRetries = 100) => {
    workerRef.current?.terminate()

    const worker = new Worker(new URL('../worker/scheduler.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker

    setStatus('running')
    setSchedule(null)
    setError(null)
    setProgress(null)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      switch (msg.type) {
        case 'PROGRESS':
          setProgress({ attempt: msg.attempt, maxAttempts: msg.maxAttempts })
          break
        case 'SUCCESS':
          setSchedule(msg.schedule)
          setStatus('success')
          worker.terminate()
          if (workerRef.current === worker) workerRef.current = null
          break
        case 'ERROR':
          setError(msg.message)
          setStatus('error')
          worker.terminate()
          if (workerRef.current === worker) workerRef.current = null
          break
      }
    }

    worker.postMessage({ type: 'GENERATE', config, maxRetries })
  }, [])

  return { generate, status, schedule, error, progress }
}
