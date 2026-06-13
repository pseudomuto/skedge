package scheduler_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pseudomuto/skedge/internal/config"
	"github.com/pseudomuto/skedge/internal/scheduler"
)

// --- test helpers ---

func blk(subject, teacher, room string) scheduler.Block {
	return scheduler.Block{Name: subject, Teacher: teacher, Room: room}
}

func testDay(name string, blocks ...scheduler.Block) scheduler.DailySchedule {
	return scheduler.DailySchedule{Day: name, Blocks: blocks}
}

func testCohort(name string, days ...scheduler.DailySchedule) scheduler.Cohort {
	return scheduler.Cohort{Name: name, Schedule: days}
}

func testClass(name string, cohorts ...scheduler.Cohort) *scheduler.Class {
	return &scheduler.Class{Name: name, Cohorts: cohorts}
}

// weekFor builds a 5-day schedule where every day gets an independent copy of blocks.
func weekFor(blocks ...scheduler.Block) []scheduler.DailySchedule {
	dayNames := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	days := make([]scheduler.DailySchedule, len(dayNames))
	for i, name := range dayNames {
		cp := make([]scheduler.Block, len(blocks))
		copy(cp, blocks)
		days[i] = scheduler.DailySchedule{Day: name, Blocks: cp}
	}
	return days
}

// validSchedule returns a schedule that satisfies all validators when used with baseValidatorConfig.
// Grade8 / 8A: 5 days × 3 blocks (1 Math, 1 English, 1 Science each day).
// Smith (room 101) teaches all three subjects.
func validSchedule() []*scheduler.Class {
	days := weekFor(
		blk("Math", "Smith", "101"),
		blk("English", "Smith", "101"),
		blk("Science", "Smith", "101"),
	)
	return []*scheduler.Class{testClass("Grade8", testCohort("8A", days...))}
}

// baseValidatorConfig matches validSchedule.
func baseValidatorConfig() *config.Config {
	return &config.Config{
		Blocks: []string{"09:00", "10:00", "11:00"},
		Subjects: []config.Subject{
			{Name: "Math"}, {Name: "English"}, {Name: "Science"},
		},
		Classes: []config.Class{{
			Name:    "Grade8",
			Cohorts: []string{"8A"},
			Subjects: []config.ClassSubject{
				{Name: "Math", Blocks: 5},
				{Name: "English", Blocks: 5},
				{Name: "Science", Blocks: 5},
			},
		}},
		Teachers: []config.Teacher{{
			Name: "Smith",
			Room: "101",
			Subjects: []config.TeacherSubject{{
				Class:    "Grade8",
				Subjects: []string{"Math", "English", "Science"},
			}},
		}},
	}
}

// --- tests ---

func TestValidateNoTeacherConflict(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: same teacher two cohorts same slot",
			schedule: []*scheduler.Class{testClass(
				"Grade8",
				testCohort("8A", testDay("Monday", blk("Math", "Smith", "101"))),
				testCohort("8B", testDay("Monday", blk("Math", "Smith", "101"))),
			)},
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateNoTeacherConflict(tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateNoRoomConflict(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: same room two cohorts same slot",
			schedule: []*scheduler.Class{testClass(
				"Grade8",
				testCohort("8A", testDay("Monday", blk("Math", "Smith", "101"))),
				testCohort("8B", testDay("Monday", blk("English", "Jones", "101"))), // different teacher, same room
			)},
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateNoRoomConflict(tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateTeacherBlockLimit(t *testing.T) {
	t.Parallel()

	// buildWithSmithBlocks distributes n blocks to "Smith" across 2 cohorts (8A and 8B),
	// filling remaining slots with "Jones". Cohorts are kept to 3 blocks/day × 5 days = 15 slots each.
	buildWithSmithBlocks := func(n int) []*scheduler.Class {
		makeCohort := func(name string, smithCount int) scheduler.Cohort {
			var days []scheduler.DailySchedule
			placed := 0
			for _, d := range []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"} {
				var blocks []scheduler.Block
				for range 3 {
					if placed < smithCount {
						blocks = append(blocks, blk("Math", "Smith", "101"))
						placed++
					} else {
						blocks = append(blocks, blk("Math", "Jones", "102"))
					}
				}
				days = append(days, testDay(d, blocks...))
			}
			return testCohort(name, days...)
		}
		aCount := n / 2
		bCount := n - aCount
		return []*scheduler.Class{testClass("Grade8", makeCohort("8A", aCount), makeCohort("8B", bCount))}
	}

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{name: "valid: 21 blocks", schedule: buildWithSmithBlocks(21), wantErr: false},
		{name: "invalid: 22 blocks", schedule: buildWithSmithBlocks(22), wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateTeacherBlockLimit(tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateNoDuplicateSubjectPerDay(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: Math appears twice on Monday",
			schedule: []*scheduler.Class{testClass(
				"Grade8",
				testCohort("8A", testDay(
					"Monday",
					blk("Math", "Smith", "101"),
					blk("Math", "Jones", "102"),
				)),
			)},
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateNoDuplicateSubjectPerDay(tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateTeacherSubjects(t *testing.T) {
	t.Parallel()

	cfg := baseValidatorConfig()

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: teacher teaching unauthorized subject",
			schedule: []*scheduler.Class{testClass(
				"Grade8",
				testCohort("8A", testDay(
					"Monday",
					blk("Art", "Smith", "101"), // Smith not authorized for Art
				)),
			)},
			wantErr: true,
		},
		{
			name: "invalid: teacher not authorized for class at all",
			schedule: []*scheduler.Class{testClass(
				"Grade8",
				testCohort("8A", testDay(
					"Monday",
					blk("Math", "Ghost", "999"), // Ghost not in config
				)),
			)},
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateTeacherSubjects(cfg, tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateSubjectBlockCounts(t *testing.T) {
	t.Parallel()

	cfg := baseValidatorConfig()

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid: exact counts",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: too many Math blocks",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				// append an extra Math block on Friday (index 4)
				fri := &s[0].Cohorts[0].Schedule[4]
				fri.Blocks = append(fri.Blocks, blk("Math", "Smith", "101"))
				return s
			}(),
			wantErr: true,
		},
		{
			name: "invalid: too few English blocks",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				// remove the English block from Monday (index 0, block index 1)
				mon := &s[0].Cohorts[0].Schedule[0]
				mon.Blocks = append(mon.Blocks[:1], mon.Blocks[2:]...)
				return s
			}(),
			wantErr: true,
		},
		{
			name: "invalid: unknown subject in schedule",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				s[0].Cohorts[0].Schedule[0].Blocks[0].Name = "Alchemy"
				return s
			}(),
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateSubjectBlockCounts(cfg, tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestValidateNoGaps(t *testing.T) {
	t.Parallel()

	cfg := baseValidatorConfig() // expects 3 blocks per day

	tests := []struct {
		name     string
		schedule []*scheduler.Class
		wantErr  bool
	}{
		{
			name:     "valid",
			schedule: validSchedule(),
			wantErr:  false,
		},
		{
			name: "invalid: missing block on Monday",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				s[0].Cohorts[0].Schedule[0].Blocks = s[0].Cohorts[0].Schedule[0].Blocks[:2]
				return s
			}(),
			wantErr: true,
		},
		{
			name: "invalid: empty subject name",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				s[0].Cohorts[0].Schedule[0].Blocks[0].Name = ""
				return s
			}(),
			wantErr: true,
		},
		{
			name: "invalid: empty teacher name",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				s[0].Cohorts[0].Schedule[0].Blocks[0].Teacher = ""
				return s
			}(),
			wantErr: true,
		},
		{
			name: "invalid: empty room",
			schedule: func() []*scheduler.Class {
				s := validSchedule()
				s[0].Cohorts[0].Schedule[0].Blocks[0].Room = ""
				return s
			}(),
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := scheduler.ValidateNoGaps(cfg, tc.schedule)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// TestValidate_combinedPassthrough ensures Validate calls all sub-validators.
func TestValidate_combinedPassthrough(t *testing.T) {
	t.Parallel()
	cfg := baseValidatorConfig()
	require.NoError(t, scheduler.Validate(cfg, validSchedule()))
}

// TestWithMaxRetries confirms the option is wired correctly: an infeasible config
// (no teachers) exhausts retries and returns an error.
func TestWithMaxRetries(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{
		Blocks:   []string{"09:00"},
		Subjects: []config.Subject{{Name: "Math"}},
		Classes: []config.Class{{
			Name:     "Grade8",
			Cohorts:  []string{"8A"},
			Subjects: []config.ClassSubject{{Name: "Math", Blocks: 5}},
		}},
		Teachers: nil, // no teachers → no valid assignment possible
	}
	s := scheduler.New(cfg, scheduler.WithMaxRetries(3))
	_, err := s.Generate(t.Context())
	require.ErrorContains(t, err, fmt.Sprintf("%d", 3))
}
