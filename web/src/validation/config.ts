import type { Config } from '../types/config'

export interface ValidationError {
  path: string
  message: string
}

export function validateConfig(config: Config): ValidationError[] {
  const errors: ValidationError[] = []

  const knownSubjects = new Set(config.subjects.map(s => s.name))
  const knownClasses = new Set(config.classes.map(c => c.name))

  validateBlocks(config.blocks, errors)
  config.subjects.forEach((s, i) => {
    if (!s.name) errors.push({ path: `subjects[${i}].name`, message: 'is required' })
  })
  config.classes.forEach((c, i) => validateClass(c, i, knownSubjects, errors))
  config.teachers.forEach((t, i) => validateTeacher(t, i, knownClasses, knownSubjects, errors))

  return errors
}

function validateBlocks(blocks: string[], errors: ValidationError[]): void {
  const seen = new Set<string>()
  blocks.forEach((b, i) => {
    if (!b) {
      errors.push({ path: `blocks[${i}]`, message: 'is required' })
    } else if (seen.has(b)) {
      errors.push({ path: `blocks[${i}]`, message: `contains duplicate value: ${b}` })
    } else {
      seen.add(b)
    }
  })
}

function validateClass(
  c: { name: string; cohorts: string[]; subjects: { name: string; blocks: number }[] },
  i: number,
  knownSubjects: Set<string>,
  errors: ValidationError[],
): void {
  const prefix = `classes[${i}]`

  if (!c.name) errors.push({ path: `${prefix}.name`, message: 'is required' })

  const seen = new Set<string>()
  c.cohorts.forEach(cohort => {
    if (seen.has(cohort)) {
      errors.push({ path: `${prefix}.cohorts`, message: `contains duplicate value: ${cohort}` })
    } else {
      seen.add(cohort)
    }
  })

  c.subjects.forEach((s, j) => {
    const subjectPrefix = `${prefix}.subjects[${j}]`
    if (!knownSubjects.has(s.name)) {
      errors.push({ path: `${subjectPrefix}.name`, message: `unknown subject: ${s.name}` })
    }
    if (s.blocks <= 0) {
      errors.push({ path: `${subjectPrefix}.blocks`, message: 'must be greater than 0' })
    }
  })
}

function validateTeacher(
  t: { name: string; room: string; subjects: { class: string; subjects: string[] }[] },
  i: number,
  knownClasses: Set<string>,
  knownSubjects: Set<string>,
  errors: ValidationError[],
): void {
  const prefix = `teachers[${i}]`

  if (!t.name) errors.push({ path: `${prefix}.name`, message: 'is required' })
  if (!t.room) errors.push({ path: `${prefix}.room`, message: 'is required' })

  t.subjects.forEach((s, j) => {
    const subjectPrefix = `${prefix}.subjects[${j}]`
    if (!knownClasses.has(s.class)) {
      errors.push({ path: `${subjectPrefix}.class`, message: `unknown class: ${s.class}` })
    }
    s.subjects.forEach((name, k) => {
      if (!knownSubjects.has(name)) {
        errors.push({ path: `${subjectPrefix}.subjects[${k}]`, message: `unknown subject: ${name}` })
      }
    })
  })
}
