import type { Config, Teacher } from '../types/config'
import type { ScheduleClass } from '../types/schedule'
import { shuffle } from './utils'
import { MAX_TEACHER_BLOCKS_PER_WEEK } from './validate'

const NODE_BUDGET = 5_000

function slotKey(day: string, blockIdx: number): string {
  return `${day}:${blockIdx}`
}

export function phase2(cfg: Config, schedule: ScheduleClass[], rng: () => number): Error | null {
  // Build authorization map: "teacher:class" -> Set<subject>
  const authorized = new Map<string, Set<string>>()
  for (const t of cfg.teachers) {
    for (const ts of t.subjects) {
      const k = `${t.name}:${ts.class}`
      if (!authorized.has(k)) authorized.set(k, new Set())
      for (const s of ts.subjects) authorized.get(k)!.add(s)
    }
  }

  // Precompute slot keys and indices
  const slotIdxMap = new Map<string, number>()
  const slots: string[] = []

  function getSlotIdx(sk: string): number {
    let idx = slotIdxMap.get(sk)
    if (idx === undefined) {
      idx = slots.length
      slotIdxMap.set(sk, idx)
      slots.push(sk)
    }
    return idx
  }

  type Target = {
    className: string
    cohortIdx: number
    classIdx: number
    dayIdx: number
    blockIdx: number
    sk: string
    initialCount: number
  }

  // First pass: collect all slots we need
  for (const cls of schedule) {
    if (cls.cohorts.length === 0) continue
    const numDays = cls.cohorts[0].schedule.length
    const numBlocks = cls.cohorts[0].schedule[0].blocks.length
    for (let di = 0; di < numDays; di++) {
      const dayName = cls.cohorts[0].schedule[di].day
      for (let bi = 0; bi < numBlocks; bi++) {
        getSlotIdx(slotKey(dayName, bi))
      }
    }
  }

  const numSlots = slots.length

  // Shuffle teachers for randomization
  const teachers: Teacher[] = [...cfg.teachers]
  shuffle(teachers, rng)
  const m = teachers.length

  // Room index map
  const roomIdxMap = new Map<string, number>()
  for (const t of teachers) {
    if (!roomIdxMap.has(t.room)) roomIdxMap.set(t.room, roomIdxMap.size)
  }
  const roomForTeacher: number[] = teachers.map((t) => roomIdxMap.get(t.room)!)
  const numRooms = roomIdxMap.size

  // Array-based state: inSlot[ti][si], inRoom[ri][si], remaining[ti]
  const inSlot: boolean[][] = Array.from({ length: m }, () => new Array<boolean>(numSlots).fill(false))
  const inRoom: boolean[][] = Array.from({ length: numRooms }, () => new Array<boolean>(numSlots).fill(false))
  const remaining: number[] = new Array<number>(m).fill(MAX_TEACHER_BLOCKS_PER_WEEK)

  // Build eligibility map for initial count (before any assignments)
  // We need to check authorization only (not slot conflicts, since nothing assigned yet)
  function isAuthorized(ti: number, className: string, subject: string): boolean {
    const k = `${teachers[ti].name}:${className}`
    return authorized.get(k)?.has(subject) ?? false
  }

  // Build targets
  const targets: Target[] = []
  for (let classIdx = 0; classIdx < schedule.length; classIdx++) {
    const cls = schedule[classIdx]
    if (cls.cohorts.length === 0) continue
    const numDays = cls.cohorts[0].schedule.length
    const numBlocks = cls.cohorts[0].schedule[0].blocks.length
    for (let di = 0; di < numDays; di++) {
      const dayName = cls.cohorts[0].schedule[di].day
      for (let bi = 0; bi < numBlocks; bi++) {
        const sk = slotKey(dayName, bi)
        for (let cohortIdx = 0; cohortIdx < cls.cohorts.length; cohortIdx++) {
          const subject = cls.cohorts[cohortIdx].schedule[di].blocks[bi].name
          let count = 0
          for (let ti = 0; ti < m; ti++) {
            if (isAuthorized(ti, cls.name, subject)) count++
          }
          targets.push({
            className: cls.name,
            cohortIdx,
            classIdx,
            dayIdx: di,
            blockIdx: bi,
            sk,
            initialCount: count,
          })
        }
      }
    }
  }

  // Sort by initial eligible count ascending (MRV)
  targets.sort((a, b) => a.initialCount - b.initialCount)

  const n = targets.length

  // Precompute canTeach[fi][ti]: teacher ti can teach subject for target fi
  // This is authorization-only (slot conflicts handled dynamically)
  const canTeach: boolean[][] = targets.map((tgt) => {
    const subject = schedule[tgt.classIdx].cohorts[tgt.cohortIdx].schedule[tgt.dayIdx].blocks[tgt.blockIdx].name
    return teachers.map((_, ti) => isAuthorized(ti, tgt.className, subject))
  })

  // Precompute slot index for each target
  const slotForTarget: number[] = targets.map((tgt) => slotIdxMap.get(tgt.sk)!)

  function fastEligible(fi: number, ti: number): boolean {
    const si = slotForTarget[fi]
    return canTeach[fi][ti] && !inSlot[ti][si] && !inRoom[roomForTeacher[ti]][si] && remaining[ti] > 0
  }

  const assigned: boolean[] = new Array<boolean>(n).fill(false)
  let nodes = 0

  function bt(): boolean {
    if (++nodes > NODE_BUDGET) return false

    // MRV: find unassigned target with fewest eligible teachers
    let bestIdx = -1
    let bestCount = m + 1
    for (let fi = 0; fi < n; fi++) {
      if (assigned[fi]) continue
      let count = 0
      for (let ti = 0; ti < m; ti++) {
        if (fastEligible(fi, ti)) count++
      }
      if (count === 0) return false
      if (count < bestCount) {
        bestCount = count
        bestIdx = fi
        if (bestCount === 1) break
      }
    }
    if (bestIdx === -1) return true

    assigned[bestIdx] = true
    const tgt = targets[bestIdx]
    const b = schedule[tgt.classIdx].cohorts[tgt.cohortIdx].schedule[tgt.dayIdx].blocks[tgt.blockIdx]
    const si = slotForTarget[bestIdx]

    for (let ti = 0; ti < m; ti++) {
      if (!fastEligible(bestIdx, ti)) continue
      const t = teachers[ti]
      b.teacher = t.name
      b.room = t.room
      const ri = roomForTeacher[ti]
      inSlot[ti][si] = true
      inRoom[ri][si] = true
      remaining[ti]--

      if (bt()) return true

      b.teacher = ''
      b.room = ''
      inSlot[ti][si] = false
      inRoom[ri][si] = false
      remaining[ti]++
    }

    assigned[bestIdx] = false
    return false
  }

  if (!bt()) return new Error('no valid teacher assignment found')
  return null
}
