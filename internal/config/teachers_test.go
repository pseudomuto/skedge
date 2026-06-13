package config_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pseudomuto/skedge/internal/config"
	"github.com/pseudomuto/skedge/pkg/validation"
)

func TestTeacher_Validate(t *testing.T) {
	t.Parallel()

	// teacherCfg wraps a teacher in a config that declares a valid class
	// ("Algebra") and subject ("Math"), so the validation context resolves
	// names and only the teacher under test can produce errors.
	teacherCfg := func(teacher config.Teacher) *config.Config {
		return &config.Config{
			Classes:  []config.Class{{Name: "Algebra"}},
			Subjects: []config.Subject{{Name: "Math"}},
			Teachers: []config.Teacher{teacher},
		}
	}

	tests := []struct {
		name string
		cfg  *config.Config
		want *validation.Error
	}{
		{
			name: "missing name",
			cfg:  teacherCfg(config.Teacher{Name: "", Room: "101"}),
			want: &validation.Error{Subject: "teachers[0]", Field: "name"},
		},
		{
			name: "missing room",
			cfg:  teacherCfg(config.Teacher{Name: "Smith", Room: ""}),
			want: &validation.Error{Subject: "teachers[0]", Field: "room"},
		},
		{
			name: "subject references unknown class",
			cfg: teacherCfg(config.Teacher{
				Name: "Smith",
				Room: "101",
				Subjects: []config.TeacherSubject{
					{Class: "Unknown", Subjects: []string{"Math"}},
				},
			}),
			want: &validation.Error{Subject: "teachers[0].subjects[0]", Field: "class"},
		},
		{
			name: "subject references unknown subject",
			cfg: teacherCfg(config.Teacher{
				Name: "Smith",
				Room: "101",
				Subjects: []config.TeacherSubject{
					{Class: "Algebra", Subjects: []string{"Unknown"}},
				},
			}),
			want: &validation.Error{Subject: "teachers[0].subjects[0]", Field: "subjects[0]"},
		},
		{
			name: "later teacher carries its index",
			cfg: &config.Config{
				Classes:  []config.Class{{Name: "Algebra"}},
				Subjects: []config.Subject{{Name: "Math"}},
				Teachers: []config.Teacher{
					{Name: "Smith", Room: "101"},
					{Name: "Jones", Room: ""},
				},
			},
			want: &validation.Error{Subject: "teachers[1]", Field: "room"},
		},
		{
			name: "valid teacher",
			cfg: teacherCfg(config.Teacher{
				Name: "Smith",
				Room: "101",
				Subjects: []config.TeacherSubject{
					{Class: "Algebra", Subjects: []string{"Math"}},
				},
			}),
			want: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := tt.cfg.Validate()
			if tt.want == nil {
				require.NoError(t, err)
				return
			}

			var errs validation.Errors
			require.True(t, errors.As(err, &errs))
			require.Len(t, errs, 1)
			require.Equal(t, tt.want.Subject, errs[0].Subject)
			require.Equal(t, tt.want.Field, errs[0].Field)
		})
	}
}
