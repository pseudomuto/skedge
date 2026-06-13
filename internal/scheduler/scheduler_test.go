package scheduler_test

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pseudomuto/skedge/internal/config"
	"github.com/pseudomuto/skedge/internal/scheduler"
)

func minimalConfig() *config.Config {
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

func TestGenerate(t *testing.T) {
	t.Parallel()
	cfg := minimalConfig()
	s := scheduler.New(cfg)

	for range 5 {
		schedule, err := s.Generate(t.Context())
		require.NoError(t, err)
		require.Len(t, schedule, 1)
		require.Len(t, schedule[0].Cohorts, 1)
		require.NoError(t, scheduler.Validate(cfg, schedule))
	}
}

func TestGenerate_demoConfig(t *testing.T) {
	t.Parallel()
	f, err := os.Open("../../dev/demo.yaml")
	require.NoError(t, err)
	defer f.Close()

	cfg, err := config.Load(f)
	require.NoError(t, err)

	_, err = scheduler.New(cfg).Generate(t.Context())
	require.NoError(t, err)
}

func TestGenerate_multiCohortContention(t *testing.T) {
	t.Parallel()
	// Two cohorts in the same class share teachers: Smith and Jones.
	// Each teacher teaches all subjects but has limited availability.
	// Phase2 must handle multiple cohorts competing for the same teacher pool.
	cfg := &config.Config{
		Blocks: []string{"09:00", "10:00", "11:00"},
		Subjects: []config.Subject{
			{Name: "Math"}, {Name: "English"}, {Name: "Science"},
		},
		Classes: []config.Class{{
			Name:    "Grade8",
			Cohorts: []string{"8A", "8B"},
			Subjects: []config.ClassSubject{
				{Name: "Math", Blocks: 5},
				{Name: "English", Blocks: 5},
				{Name: "Science", Blocks: 5},
			},
		}},
		Teachers: []config.Teacher{
			{
				Name: "Smith",
				Room: "101",
				Subjects: []config.TeacherSubject{{
					Class:    "Grade8",
					Subjects: []string{"Math", "English", "Science"},
				}},
			},
			{
				Name: "Jones",
				Room: "102",
				Subjects: []config.TeacherSubject{{
					Class:    "Grade8",
					Subjects: []string{"Math", "English", "Science"},
				}},
			},
		},
	}

	s := scheduler.New(cfg)
	for range 5 {
		schedule, err := s.Generate(t.Context())
		require.NoError(t, err)
		require.Len(t, schedule, 1)
		require.Len(t, schedule[0].Cohorts, 2)
		require.NoError(t, scheduler.Validate(cfg, schedule))
	}
}
