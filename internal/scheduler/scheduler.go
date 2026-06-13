// Package scheduler generates weekly class schedules that satisfy the following
// constraints:
//
//   - Every time slot is fully assigned: each block has a subject, a teacher, and a room.
//   - Each cohort receives exactly the number of weekly blocks specified per subject.
//   - No subject appears more than once on the same day for the same cohort.
//   - Each teacher only teaches subjects they are authorized for in the relevant class.
//   - No teacher is assigned to more than one cohort in the same time slot.
//   - No room is used by more than one cohort in the same time slot.
//   - No teacher is assigned more than [maxTeacherBlocksPerWeek] blocks in total across all cohorts.
//
// A generated schedule can be verified against these rules at any time via [Validate].
package scheduler

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/pseudomuto/skedge/internal/config"
)

const defaultMaxRetries = 100

type (
	// Scheduler generates weekly class schedules from a [config.Config].
	Scheduler struct {
		cfg         *config.Config
		days        []string
		maxAttempts int
		rng         *rand.Rand
	}

	// Option is a functional option for [New].
	Option func(*Scheduler)
)

// New returns a Scheduler for cfg. The default schedule covers Monday through
// Friday and retries up to [defaultMaxRetries] times before giving up.
func New(cfg *config.Config, opts ...Option) *Scheduler {
	s := &Scheduler{
		cfg: cfg,
		days: []string{
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
		},
		maxAttempts: defaultMaxRetries,
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

// WithMaxRetries overrides the number of randomized attempts Generate may make
// before returning an error.
func WithMaxRetries(n int) Option {
	return func(s *Scheduler) {
		s.maxAttempts = n
	}
}

// Generate produces a schedule satisfying all package constraints. It returns
// an error if no valid schedule is found within the configured attempt limit.
func (s *Scheduler) Generate(_ context.Context) ([]*Class, error) {
	for i := 0; i < s.maxAttempts; i++ {
		schedule := buildEmptySchedule(s.cfg, s.days)
		if err := phase1(s.cfg, schedule, s.rng); err != nil {
			continue
		}

		if err := phase2(s.cfg, schedule, s.rng); err != nil {
			continue
		}

		if err := Validate(s.cfg, schedule); err != nil {
			continue
		}

		return schedule, nil
	}

	return nil, fmt.Errorf("could not generate a valid schedule after %d attempts", s.maxAttempts)
}

func buildEmptySchedule(cfg *config.Config, days []string) []*Class {
	classes := make([]*Class, len(cfg.Classes))
	for ci, c := range cfg.Classes {
		cohorts := make([]Cohort, len(c.Cohorts))
		for cohortIdx, name := range c.Cohorts {
			schedule := make([]DailySchedule, len(days))
			for dayIdx, dayName := range days {
				schedule[dayIdx] = DailySchedule{
					Day:    dayName,
					Blocks: make([]Block, len(cfg.Blocks)),
				}
			}

			cohorts[cohortIdx] = Cohort{Name: name, Schedule: schedule}
		}

		classes[ci] = &Class{Name: c.Name, Cohorts: cohorts}
	}

	return classes
}
