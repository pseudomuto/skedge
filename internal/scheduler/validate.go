package scheduler

import (
	"fmt"

	"github.com/pseudomuto/skedge/internal/config"
)

// maxTeacherBlocksPerWeek is the hard cap on teaching blocks per teacher across
// all cohorts in a week.
const maxTeacherBlocksPerWeek = 21

// Validate checks all schedule constraints and returns the first violation
// found, or nil if the schedule is valid. The checks are:
//
//   - [ValidateNoTeacherConflict]: no teacher in two places at once.
//   - [ValidateNoRoomConflict]: no room used by two cohorts at once.
//   - [ValidateTeacherBlockLimit]: no teacher exceeds the weekly block cap.
//   - [ValidateNoDuplicateSubjectPerDay]: each subject appears at most once per day per cohort.
//   - [ValidateTeacherSubjects]: teachers only teach subjects they are authorized for.
//   - [ValidateSubjectBlockCounts]: each cohort has the exact weekly block count per subject.
//   - [ValidateNoGaps]: every block slot has a subject, teacher, and room assigned.
func Validate(cfg *config.Config, schedule []*Class) error {
	checks := []func() error{
		func() error { return ValidateNoTeacherConflict(schedule) },
		func() error { return ValidateNoRoomConflict(schedule) },
		func() error { return ValidateTeacherBlockLimit(schedule) },
		func() error { return ValidateNoDuplicateSubjectPerDay(schedule) },
		func() error { return ValidateTeacherSubjects(cfg, schedule) },
		func() error { return ValidateSubjectBlockCounts(cfg, schedule) },
		func() error { return ValidateNoGaps(cfg, schedule) },
	}
	for _, check := range checks {
		if err := check(); err != nil {
			return err
		}
	}
	return nil
}

// ValidateNoTeacherConflict returns an error if any teacher is assigned to
// more than one cohort in the same (day, block) slot.
func ValidateNoTeacherConflict(schedule []*Class) error {
	type key struct {
		day     string
		block   int
		teacher string
	}

	seen := make(map[key]string) // key -> first cohort name
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			for _, d := range cohort.Schedule {
				for i, b := range d.Blocks {
					k := key{d.Day, i, b.Teacher}
					if other, ok := seen[k]; ok {
						return fmt.Errorf(
							"teacher %s double-booked on %s block %d: cohorts %s and %s",
							b.Teacher,
							d.Day,
							i,
							other,
							cohort.Name,
						)
					}

					seen[k] = cohort.Name
				}
			}
		}
	}
	return nil
}

// ValidateNoRoomConflict returns an error if any room is used by more than one
// cohort in the same (day, block) slot.
func ValidateNoRoomConflict(schedule []*Class) error {
	type key struct {
		day   string
		block int
		room  string
	}
	seen := make(map[key]string) // key -> first cohort name
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			for _, d := range cohort.Schedule {
				for i, b := range d.Blocks {
					k := key{d.Day, i, b.Room}
					if other, ok := seen[k]; ok {
						return fmt.Errorf("room %s double-booked on %s block %d: cohorts %s and %s", b.Room, d.Day, i, other, cohort.Name)
					}
					seen[k] = cohort.Name
				}
			}
		}
	}
	return nil
}

// ValidateTeacherBlockLimit returns an error if any teacher is assigned more
// than [maxTeacherBlocksPerWeek] blocks in total across all cohorts.
func ValidateTeacherBlockLimit(schedule []*Class) error {
	counts := make(map[string]int)
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			for _, d := range cohort.Schedule {
				for _, b := range d.Blocks {
					counts[b.Teacher]++
				}
			}
		}
	}
	for teacher, count := range counts {
		if count > maxTeacherBlocksPerWeek {
			return fmt.Errorf("teacher %s has %d blocks, exceeds weekly limit of %d", teacher, count, maxTeacherBlocksPerWeek)
		}
	}
	return nil
}

// ValidateNoDuplicateSubjectPerDay returns an error if any cohort has the same
// subject scheduled more than once on the same day.
func ValidateNoDuplicateSubjectPerDay(schedule []*Class) error {
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			if err := validateCohortNoDuplicateSubjectPerDay(&cohort); err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidateTeacherSubjects returns an error if any teacher is assigned a subject
// they are not authorized to teach in the relevant class.
func ValidateTeacherSubjects(cfg *config.Config, schedule []*Class) error {
	type authKey struct{ teacher, class string }
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
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			for _, d := range cohort.Schedule {
				for _, b := range d.Blocks {
					k := authKey{b.Teacher, class.Name}
					subjects, ok := authorized[k]
					if !ok {
						return fmt.Errorf("teacher %s has no subjects authorized for class %s", b.Teacher, class.Name)
					}
					if _, ok := subjects[b.Name]; !ok {
						return fmt.Errorf("teacher %s not authorized to teach %s in class %s", b.Teacher, b.Name, class.Name)
					}
				}
			}
		}
	}
	return nil
}

// ValidateSubjectBlockCounts returns an error if any cohort's actual weekly
// block count for a subject differs from the count required by the class
// configuration.
func ValidateSubjectBlockCounts(cfg *config.Config, schedule []*Class) error {
	required := make(map[string]map[string]int) // className -> subjectName -> required count
	for _, c := range cfg.Classes {
		required[c.Name] = make(map[string]int)
		for _, s := range c.Subjects {
			required[c.Name][s.Name] = s.Blocks
		}
	}
	for _, class := range schedule {
		req := required[class.Name]
		for _, cohort := range class.Cohorts {
			actual := make(map[string]int)
			for _, d := range cohort.Schedule {
				for _, b := range d.Blocks {
					actual[b.Name]++
				}
			}
			for subject, want := range req {
				if actual[subject] != want {
					return fmt.Errorf("cohort %s has %d blocks of %s, expected %d", cohort.Name, actual[subject], subject, want)
				}
			}
			for subject := range actual {
				if _, ok := req[subject]; !ok {
					return fmt.Errorf("cohort %s has unknown subject %s", cohort.Name, subject)
				}
			}
		}
	}
	return nil
}

// ValidateNoGaps returns an error if any block slot has an empty subject,
// teacher, or room, or if a cohort's day has a different number of blocks than
// the configuration specifies.
func ValidateNoGaps(cfg *config.Config, schedule []*Class) error {
	expected := len(cfg.Blocks)
	for _, class := range schedule {
		for _, cohort := range class.Cohorts {
			for _, d := range cohort.Schedule {
				if len(d.Blocks) != expected {
					return fmt.Errorf("cohort %s on %s has %d blocks, expected %d", cohort.Name, d.Day, len(d.Blocks), expected)
				}
				for i, b := range d.Blocks {
					if b.Name == "" || b.Teacher == "" || b.Room == "" {
						return fmt.Errorf("cohort %s on %s block %d has empty field", cohort.Name, d.Day, i)
					}
				}
			}
		}
	}
	return nil
}

func validateCohortNoDuplicateSubjectPerDay(cohort *Cohort) error {
	for _, d := range cohort.Schedule {
		seen := make(map[string]struct{})
		for _, b := range d.Blocks {
			if _, ok := seen[b.Name]; ok {
				return fmt.Errorf("cohort %s has subject %s more than once on %s", cohort.Name, b.Name, d.Day)
			}
			seen[b.Name] = struct{}{}
		}
	}
	return nil
}
