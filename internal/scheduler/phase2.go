package scheduler

import (
	"fmt"
	"math/rand"
	"sort"

	"github.com/pseudomuto/skedge/internal/config"
)

// phase2 fills Block.Teacher and Block.Room for every slot in schedule using
// backtracking search. Targets are ordered globally most-constrained-first so
// that hard constraints (e.g. single-teacher subjects) are detected and fail-fast
// early, rather than after exhausting large portions of the search space.
func phase2(cfg *config.Config, schedule []*Class, rng *rand.Rand) error {
	type slotKey struct {
		day   string
		block int
	}
	type authKey struct {
		teacher string
		class   string
	}

	teacherInSlot := make(map[slotKey]map[string]bool)
	roomInSlot := make(map[slotKey]map[string]bool)
	teacherTotal := make(map[string]int)

	authorized := make(map[authKey]map[string]struct{})
	for _, t := range cfg.Teachers {
		for _, ts := range t.Subjects {
			k := authKey{t.Name, ts.Class}
			if authorized[k] == nil {
				authorized[k] = make(map[string]struct{})
			}
			for _, s := range ts.Subjects {
				authorized[k][s] = struct{}{}
			}
		}
	}

	eligible := func(t config.Teacher, className, subject string, sk slotKey) bool {
		subjects, ok := authorized[authKey{t.Name, className}]
		if !ok {
			return false
		}
		if _, ok := subjects[subject]; !ok {
			return false
		}
		if teacherInSlot[sk][t.Name] {
			return false
		}
		if roomInSlot[sk][t.Room] {
			return false
		}
		return teacherTotal[t.Name] < maxTeacherBlocksPerWeek
	}

	type target struct {
		className    string
		cohort       *Cohort
		dayIdx       int
		blockIdx     int
		sk           slotKey
		initialCount int
	}

	// Build targets and compute initial eligible counts before any assignments.
	// Targets are then sorted most-constrained-first so single-teacher subjects
	// (e.g. Music → only Gumaste) are processed first and conflicts surface immediately.
	var targets []target
	for _, class := range schedule {
		if len(class.Cohorts) == 0 {
			continue
		}
		numDays := len(class.Cohorts[0].Schedule)
		numBlocks := len(class.Cohorts[0].Schedule[0].Blocks)
		for di := range numDays {
			dayName := class.Cohorts[0].Schedule[di].Day
			for bi := range numBlocks {
				sk := slotKey{dayName, bi}
				if teacherInSlot[sk] == nil {
					teacherInSlot[sk] = make(map[string]bool)
				}
				if roomInSlot[sk] == nil {
					roomInSlot[sk] = make(map[string]bool)
				}
				for ci := range class.Cohorts {
					subject := class.Cohorts[ci].Schedule[di].Blocks[bi].Name
					count := 0
					for _, t := range cfg.Teachers {
						if eligible(t, class.Name, subject, sk) {
							count++
						}
					}
					targets = append(targets, target{
						className:    class.Name,
						cohort:       &class.Cohorts[ci],
						dayIdx:       di,
						blockIdx:     bi,
						sk:           sk,
						initialCount: count,
					})
				}
			}
		}
	}

	sort.SliceStable(targets, func(i, j int) bool {
		return targets[i].initialCount < targets[j].initialCount
	})

	// Shuffle teachers so different retry attempts explore different orderings.
	teachers := make([]config.Teacher, len(cfg.Teachers))
	copy(teachers, cfg.Teachers)
	rng.Shuffle(len(teachers), func(i, j int) { teachers[i], teachers[j] = teachers[j], teachers[i] })

	n := len(targets)
	m := len(teachers)

	// Precompute slot indices so slot membership can be checked via arrays instead
	// of map lookups. This makes each MRV scan ~10× faster.
	var slots []slotKey
	slotIdx := make(map[slotKey]int)
	for _, tgt := range targets {
		if _, ok := slotIdx[tgt.sk]; !ok {
			slotIdx[tgt.sk] = len(slots)
			slots = append(slots, tgt.sk)
		}
	}
	slotForTarget := make([]int, n)
	for fi, tgt := range targets {
		slotForTarget[fi] = slotIdx[tgt.sk]
	}

	// Precompute room indices.
	roomIdxMap := make(map[string]int)
	for _, t := range teachers {
		if _, ok := roomIdxMap[t.Room]; !ok {
			roomIdxMap[t.Room] = len(roomIdxMap)
		}
	}
	roomForTeacher := make([]int, m)
	for ti, t := range teachers {
		roomForTeacher[ti] = roomIdxMap[t.Room]
	}

	// canTeach[fi][ti] = teacher[ti] is authorized for the subject of target[fi].
	canTeach := make([][]bool, n)
	for fi, tgt := range targets {
		canTeach[fi] = make([]bool, m)
		blockName := tgt.cohort.Schedule[tgt.dayIdx].Blocks[tgt.blockIdx].Name
		for ti, t := range teachers {
			if eligible(t, tgt.className, blockName, tgt.sk) {
				canTeach[fi][ti] = true
			}
		}
	}

	// Array-based state: avoids per-call map lookups inside the hot MRV loop.
	inSlot := make([][]bool, m)     // inSlot[ti][si]
	inRoom := make([][]bool, len(roomIdxMap)) // inRoom[ri][si]
	for ti := range teachers {
		inSlot[ti] = make([]bool, len(slots))
	}
	for ri := range inRoom {
		inRoom[ri] = make([]bool, len(slots))
	}
	remaining := make([]int, m)
	for ti := range remaining {
		remaining[ti] = maxTeacherBlocksPerWeek
	}

	fastEligible := func(fi, ti int) bool {
		si := slotForTarget[fi]
		return canTeach[fi][ti] && !inSlot[ti][si] && !inRoom[roomForTeacher[ti]][si] && remaining[ti] > 0
	}

	// MRV backtracking with a node budget. We pick the unassigned target with the
	// fewest currently eligible teachers (minimum remaining values). A target hitting
	// 0 eligible teachers is detected immediately (forward check). The budget caps
	// work on phase1 outputs that are globally infeasible in ways only detectable
	// late in the search; those attempts are abandoned so the outer retry loop can
	// try a fresh phase1 shuffle. Feasible configs are solved in O(n) MRV steps.
	const nodeBudget = 5_000
	assigned := make([]bool, n)
	nodes := 0

	var bt func() bool
	bt = func() bool {
		if nodes++; nodes > nodeBudget {
			return false
		}
		bestIdx := -1
		bestCount := m + 1
		for fi := range targets {
			if assigned[fi] {
				continue
			}
			count := 0
			for ti := range teachers {
				if fastEligible(fi, ti) {
					count++
				}
			}
			if count == 0 {
				return false
			}
			if count < bestCount {
				bestCount = count
				bestIdx = fi
				if bestCount == 1 {
					break // can't do better; assign immediately
				}
			}
		}

		if bestIdx == -1 {
			return true
		}

		assigned[bestIdx] = true
		tgt := targets[bestIdx]
		b := &tgt.cohort.Schedule[tgt.dayIdx].Blocks[tgt.blockIdx]
		si := slotForTarget[bestIdx]

		for ti, t := range teachers {
			if !fastEligible(bestIdx, ti) {
				continue
			}
			b.Teacher = t.Name
			b.Room = t.Room
			ri := roomForTeacher[ti]
			inSlot[ti][si] = true
			inRoom[ri][si] = true
			remaining[ti]--

			if bt() {
				return true
			}

			b.Teacher = ""
			b.Room = ""
			inSlot[ti][si] = false
			inRoom[ri][si] = false
			remaining[ti]++
		}

		assigned[bestIdx] = false
		return false
	}

	if !bt() {
		return fmt.Errorf("no valid teacher assignment found")
	}
	return nil
}
