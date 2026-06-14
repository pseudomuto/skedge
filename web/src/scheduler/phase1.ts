import type { Config } from '../types/config'
import type { Cohort, DailySchedule, ScheduleClass } from '../types/schedule'
import { shuffle } from './utils'

function buildRequiredBlocks(subjects: { name: string; blocks: number }[]): string[] {
  const result: string[] = []
  for (const s of subjects) {
    for (let i = 0; i < s.blocks; i++) result.push(s.name)
  }
  return result
}

// Bipartite matching check: can `subjects` (list of subject indices, may have repeats)
// all be matched to distinct teachers given canTeach[teacherIdx][subjectIdx]?
function slotMatchable(
  si: number,
  subjectIdx: number,
  slotSubjectCount: number[][],
  canTeach: boolean[][],
  numTeachers: number,
): boolean {
  const subjects: number[] = []
  for (let sIdx = 0; sIdx < slotSubjectCount[si].length; sIdx++) {
    for (let k = 0; k < slotSubjectCount[si][sIdx]; k++) subjects.push(sIdx)
  }
  subjects.push(subjectIdx)

  const n = subjects.length
  const match = new Array<number>(numTeachers).fill(-1)

  function augment(pos: number, visited: boolean[]): boolean {
    const sIdx = subjects[pos]
    for (let ti = 0; ti < numTeachers; ti++) {
      if (visited[ti] || !canTeach[ti][sIdx]) continue
      visited[ti] = true
      if (match[ti] === -1 || augment(match[ti], visited)) {
        match[ti] = pos
        return true
      }
    }
    return false
  }

  for (let i = 0; i < n; i++) {
    const visited = new Array<boolean>(numTeachers).fill(false)
    if (!augment(i, visited)) return false
  }
  return true
}

function placeBacktrack(
  schedule: DailySchedule[],
  order: string[],
  counts: Map<string, number>,
  di: number,
  bi: number,
  usedToday: Set<string>,
  subjectToIdx: Map<string, number>,
  canTeach: boolean[][],
  slotSubjectCount: number[][],
  numBlocks: number,
): boolean {
  if (di === schedule.length) return true
  if (bi === schedule[di].blocks.length) {
    return placeBacktrack(
      schedule,
      order,
      counts,
      di + 1,
      0,
      new Set(),
      subjectToIdx,
      canTeach,
      slotSubjectCount,
      numBlocks,
    )
  }

  const numDays = schedule.length
  const blocksPerDay = schedule[di].blocks.length
  const remainingToday = blocksPerDay - bi - 1
  const si = di * numBlocks + bi
  const numTeachers = canTeach.length

  for (const subj of order) {
    if ((counts.get(subj) ?? 0) === 0 || usedToday.has(subj)) continue

    const subjIdx = subjectToIdx.get(subj)!
    if (!slotMatchable(si, subjIdx, slotSubjectCount, canTeach, numTeachers)) continue

    schedule[di].blocks[bi].name = subj
    counts.set(subj, counts.get(subj)! - 1)
    usedToday.add(subj)
    slotSubjectCount[si][subjIdx]++

    // Forward check: every remaining subject must still have enough days left
    let fc = true
    for (const s of order) {
      const remaining = counts.get(s) ?? 0
      if (remaining === 0) continue
      let maxPlacements = numDays - di - 1
      if (remainingToday > 0 && !usedToday.has(s)) maxPlacements++
      if (maxPlacements < remaining) {
        fc = false
        break
      }
    }

    if (
      fc &&
      placeBacktrack(
        schedule,
        order,
        counts,
        di,
        bi + 1,
        usedToday,
        subjectToIdx,
        canTeach,
        slotSubjectCount,
        numBlocks,
      )
    ) {
      return true
    }

    schedule[di].blocks[bi].name = ''
    counts.set(subj, counts.get(subj)! + 1)
    usedToday.delete(subj)
    slotSubjectCount[si][subjIdx]--
  }
  return false
}

function placeSubjects(
  cohort: Cohort,
  shuffled: string[],
  subjectToIdx: Map<string, number>,
  canTeach: boolean[][],
  slotSubjectCount: number[][],
  numBlocks: number,
): Error | null {
  const seen = new Set<string>()
  const order: string[] = []
  for (const s of shuffled) {
    if (!seen.has(s)) {
      order.push(s)
      seen.add(s)
    }
  }

  const counts = new Map<string, number>()
  for (const s of shuffled) counts.set(s, (counts.get(s) ?? 0) + 1)

  if (
    !placeBacktrack(
      cohort.schedule,
      order,
      counts,
      0,
      0,
      new Set(),
      subjectToIdx,
      canTeach,
      slotSubjectCount,
      numBlocks,
    )
  ) {
    return new Error('cannot place subjects without duplicates (config is infeasible)')
  }
  return null
}

export function phase1(cfg: Config, schedule: ScheduleClass[], rng: () => number): Error | null {
  for (let ci = 0; ci < cfg.classes.length; ci++) {
    const cfgClass = cfg.classes[ci]
    if (schedule[ci].cohorts.length === 0) continue

    const numBlocks = schedule[ci].cohorts[0].schedule[0].blocks.length
    const numDays = schedule[ci].cohorts[0].schedule.length
    const numSlots = numDays * numBlocks

    // Stable-order distinct subjects
    const seen = new Set<string>()
    const subjectOrder: string[] = []
    for (const s of cfgClass.subjects) {
      if (!seen.has(s.name)) {
        subjectOrder.push(s.name)
        seen.add(s.name)
      }
    }
    const subjectToIdx = new Map<string, number>()
    for (let i = 0; i < subjectOrder.length; i++) subjectToIdx.set(subjectOrder[i], i)

    // Teachers for this class
    const classTeachers = cfg.teachers.filter((t) => t.subjects.some((ts) => ts.class === cfgClass.name))

    const numSubjects = subjectOrder.length
    const canTeach: boolean[][] = classTeachers.map((t) => {
      const row = new Array<boolean>(numSubjects).fill(false)
      for (const ts of t.subjects) {
        if (ts.class === cfgClass.name) {
          for (const s of ts.subjects) {
            const idx = subjectToIdx.get(s)
            if (idx !== undefined) row[idx] = true
          }
        }
      }
      return row
    })

    const slotSubjectCount: number[][] = Array.from({ length: numSlots }, () => new Array<number>(numSubjects).fill(0))

    const required = buildRequiredBlocks(cfgClass.subjects)

    for (let j = 0; j < schedule[ci].cohorts.length; j++) {
      const cohort = schedule[ci].cohorts[j]
      const shuffled = [...required]
      shuffle(shuffled, rng)
      const err = placeSubjects(cohort, shuffled, subjectToIdx, canTeach, slotSubjectCount, numBlocks)
      if (err) return err
    }
  }
  return null
}
