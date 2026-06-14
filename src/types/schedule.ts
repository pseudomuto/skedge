export interface Block {
  name: string
  teacher: string
  room: string
}
export interface DailySchedule {
  day: string
  blocks: Block[]
}
export interface Cohort {
  name: string
  schedule: DailySchedule[]
}
export interface ScheduleClass {
  name: string
  cohorts: Cohort[]
}
