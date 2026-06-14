import { generate } from '../scheduler/index'
import type { Config } from '../types/config'
import type { ScheduleClass } from '../types/schedule'

type WorkerRequest = { type: 'GENERATE'; config: Config; maxRetries?: number }

type WorkerResponse =
  | { type: 'PROGRESS'; attempt: number; maxAttempts: number }
  | { type: 'SUCCESS'; schedule: ScheduleClass[] }
  | { type: 'ERROR'; message: string }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, config, maxRetries = 100 } = event.data
  if (type !== 'GENERATE') return

  const result = generate(config, maxRetries, (attempt) => {
    self.postMessage({ type: 'PROGRESS', attempt, maxAttempts: maxRetries } satisfies WorkerResponse)
  })

  if (result.ok) {
    self.postMessage({ type: 'SUCCESS', schedule: result.value } satisfies WorkerResponse)
  } else {
    self.postMessage({ type: 'ERROR', message: result.error } satisfies WorkerResponse)
  }
}
