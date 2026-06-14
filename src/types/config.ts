export interface Subject {
  name: string
}
export interface ClassSubject {
  name: string
  blocks: number
}
export interface Class {
  name: string
  cohorts: string[]
  subjects: ClassSubject[]
}
export interface TeacherSubject {
  class: string
  subjects: string[]
}
export interface Teacher {
  name: string
  room: string
  subjects: TeacherSubject[]
}
export interface Config {
  blocks: string[]
  subjects: Subject[]
  classes: Class[]
  teachers: Teacher[]
}
