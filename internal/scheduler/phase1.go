package scheduler

import (
	"fmt"
	"math/rand"

	"github.com/pseudomuto/skedge/internal/config"
)

// phase1 fills Block.Name for every slot in schedule. Each cohort gets its own
// independent shuffle of the class's required subject blocks, distributed across
// days with no subject appearing twice on the same day.
//
// Cohorts within a class share a slotSubjectCount table so that before placing
// subject S in any slot the algorithm can run a bipartite matching check: the
// subjects already assigned to that slot (across all cohorts placed so far)
// plus S must still have a complete teacher-to-subject matching. This catches
// joint teacher-pool violations -- e.g. French, Hist/Geo, and Science share the
// pool {Bernier, Miller, Savoie}, so no slot may hold more than 3 cohorts with
// subjects from that group even though each subject individually allows cap 3.
func phase1(cfg *config.Config, schedule []*Class, rng *rand.Rand) error {
	for ci, cfgClass := range cfg.Classes {
		if len(schedule[ci].Cohorts) == 0 {
			continue
		}

		numBlocks := len(schedule[ci].Cohorts[0].Schedule[0].Blocks)
		numDays := len(schedule[ci].Cohorts[0].Schedule)
		numSlots := numDays * numBlocks

		// Enumerate the distinct subjects for this class in a stable order.
		seen := make(map[string]bool)
		var subjectOrder []string
		for _, s := range cfgClass.Subjects {
			if !seen[s.Name] {
				subjectOrder = append(subjectOrder, s.Name)
				seen[s.Name] = true
			}
		}
		subjectToIdx := make(map[string]int, len(subjectOrder))
		for i, s := range subjectOrder {
			subjectToIdx[s] = i
		}

		// Collect teachers for this class.
		var classTeachers []config.Teacher
		for _, t := range cfg.Teachers {
			for _, ts := range t.Subjects {
				if ts.Class == cfgClass.Name {
					classTeachers = append(classTeachers, t)
					break
				}
			}
		}

		// canTeach[ti][si] = teacher ti authorized for subject si.
		numSubjects := len(subjectOrder)
		canTeach := make([][]bool, len(classTeachers))
		for ti, t := range classTeachers {
			canTeach[ti] = make([]bool, numSubjects)
			for _, ts := range t.Subjects {
				if ts.Class == cfgClass.Name {
					for _, s := range ts.Subjects {
						if idx, ok := subjectToIdx[s]; ok {
							canTeach[ti][idx] = true
						}
					}
				}
			}
		}

		// slotSubjectCount[slotIdx][subjectIdx] = number of cohorts placed so far
		// that have this subject in this slot. Shared and updated across cohorts.
		slotSubjectCount := make([][]int, numSlots)
		for i := range slotSubjectCount {
			slotSubjectCount[i] = make([]int, numSubjects)
		}

		required := buildRequiredBlocks(&cfgClass)
		for j := range schedule[ci].Cohorts {
			cohort := &schedule[ci].Cohorts[j]
			shuffled := make([]string, len(required))
			copy(shuffled, required)
			rng.Shuffle(len(shuffled), func(a, b int) { shuffled[a], shuffled[b] = shuffled[b], shuffled[a] })
			if err := placeSubjects(cohort, shuffled, subjectToIdx, canTeach, slotSubjectCount, numBlocks); err != nil {
				return err
			}
		}
	}
	return nil
}

func buildRequiredBlocks(c *config.Class) []string {
	var blocks []string
	for _, s := range c.Subjects {
		for i := 0; i < s.Blocks; i++ {
			blocks = append(blocks, s.Name)
		}
	}
	return blocks
}

// placeSubjects distributes subjects into the cohort's day/block grid using
// randomized backtracking. The trial order is derived from the shuffled list
// so different shuffles explore different paths through the search space,
// enabling the outer retry loop to find conflict-free teacher assignments.
func placeSubjects(cohort *Cohort, shuffled []string, subjectToIdx map[string]int, canTeach [][]bool, slotSubjectCount [][]int, numBlocks int) error {
	seen := make(map[string]bool)
	var order []string
	for _, s := range shuffled {
		if !seen[s] {
			order = append(order, s)
			seen[s] = true
		}
	}

	counts := make(map[string]int)
	for _, s := range shuffled {
		counts[s]++
	}

	if !placeBacktrack(cohort.Schedule, order, counts, 0, 0, make(map[string]bool), subjectToIdx, canTeach, slotSubjectCount, numBlocks) {
		return fmt.Errorf("cannot place subjects without duplicates (config is infeasible)")
	}
	return nil
}

func placeBacktrack(schedule []DailySchedule, order []string, counts map[string]int, di, bi int, usedToday map[string]bool, subjectToIdx map[string]int, canTeach [][]bool, slotSubjectCount [][]int, numBlocks int) bool {
	if di == len(schedule) {
		return true
	}
	if bi == len(schedule[di].Blocks) {
		return placeBacktrack(schedule, order, counts, di+1, 0, make(map[string]bool), subjectToIdx, canTeach, slotSubjectCount, numBlocks)
	}

	numDays := len(schedule)
	blocksPerDay := len(schedule[di].Blocks)
	remainingToday := blocksPerDay - bi - 1
	si := di*numBlocks + bi

	numTeachers := len(canTeach)

	for _, subj := range order {
		if counts[subj] == 0 || usedToday[subj] {
			continue
		}

		subjIdx := subjectToIdx[subj]

		// Bipartite matching check: verify that adding subj to slot si still
		// leaves a complete teacher assignment for all subjects in this slot.
		// This enforces joint teacher-pool constraints across subject groups.
		if !slotMatchable(si, subjIdx, slotSubjectCount, canTeach, numTeachers) {
			continue
		}

		schedule[di].Blocks[bi].Name = subj
		counts[subj]--
		usedToday[subj] = true
		slotSubjectCount[si][subjIdx]++

		// Forward check: each remaining subject needs at least counts[s] more
		// placements. After this slot, a subject can go in at most one more slot
		// today (if not already used today) plus one slot per remaining future day.
		// Prune immediately if any subject can no longer reach its required count.
		fc := true
		for _, s := range order {
			if counts[s] == 0 {
				continue
			}
			maxPlacements := numDays - di - 1
			if remainingToday > 0 && !usedToday[s] {
				maxPlacements++
			}
			if maxPlacements < counts[s] {
				fc = false
				break
			}
		}

		if fc && placeBacktrack(schedule, order, counts, di, bi+1, usedToday, subjectToIdx, canTeach, slotSubjectCount, numBlocks) {
			return true
		}

		schedule[di].Blocks[bi].Name = ""
		counts[subj]++
		delete(usedToday, subj)
		slotSubjectCount[si][subjIdx]--
	}

	return false
}

// slotMatchable checks whether adding subjectIdx to slot si would still allow
// a complete bipartite matching between all subjects in that slot and teachers.
// Uses the standard augmenting-path algorithm.
func slotMatchable(si, subjectIdx int, slotSubjectCount [][]int, canTeach [][]bool, numTeachers int) bool {
	// Build the current subject list for this slot including the candidate.
	numSubjects := len(slotSubjectCount[si])
	total := 1 // the candidate itself
	for _, c := range slotSubjectCount[si] {
		total += c
	}

	// subjects[i] = subject index for the i-th entry in the slot.
	subjects := make([]int, 0, total)
	for sIdx, cnt := range slotSubjectCount[si] {
		for k := 0; k < cnt; k++ {
			subjects = append(subjects, sIdx)
		}
	}
	subjects = append(subjects, subjectIdx)
	_ = numSubjects

	n := len(subjects)
	match := make([]int, numTeachers)
	for i := range match {
		match[i] = -1
	}

	var augment func(pos int, visited []bool) bool
	augment = func(pos int, visited []bool) bool {
		sIdx := subjects[pos]
		for ti := range canTeach {
			if visited[ti] || !canTeach[ti][sIdx] {
				continue
			}
			visited[ti] = true
			if match[ti] == -1 || augment(match[ti], visited) {
				match[ti] = pos
				return true
			}
		}
		return false
	}

	for i := 0; i < n; i++ {
		visited := make([]bool, numTeachers)
		if !augment(i, visited) {
			return false
		}
	}
	return true
}
