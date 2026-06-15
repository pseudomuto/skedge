import type { Config } from './config'
import type { ScheduleClass } from './schedule'

export interface TermExport {
  version: 1
  name: string
  exportedAt: number
  config: Config | null
  schedules: Array<{
    generatedAt: number
    label: string
    schedule: ScheduleClass[]
    configSnapshot: Config
  }>
}
