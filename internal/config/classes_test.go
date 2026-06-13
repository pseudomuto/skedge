package config_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pseudomuto/skedge/internal/config"
	"github.com/pseudomuto/skedge/pkg/validation"
)

func TestClass_Validate(t *testing.T) {
	t.Parallel()

	// classWith builds a single-class config declaring "Math" as a subject, with
	// the class referencing a subject of the given name and block count.
	classWith := func(subject string, blocks int) *config.Config {
		return &config.Config{
			Subjects: []config.Subject{{Name: "Math"}},
			Classes: []config.Class{
				{
					Name:     "Algebra",
					Subjects: []config.ClassSubject{{Name: subject, Blocks: blocks}},
				},
			},
		}
	}

	tests := []struct {
		name string
		cfg  *config.Config
		want *validation.Error
	}{
		{
			name: "invalid blocks carries the full path",
			cfg:  classWith("Math", 0),
			want: &validation.Error{Subject: "classes[0].subjects[0]", Field: "blocks"},
		},
		{
			name: "unknown subject name carries the full path",
			cfg:  classWith("History", 2),
			want: &validation.Error{Subject: "classes[0].subjects[0]", Field: "name"},
		},
		{
			name: "error in a later class carries its index",
			cfg: &config.Config{
				Subjects: []config.Subject{{Name: "Math"}},
				Classes: []config.Class{
					{Name: "Algebra", Subjects: []config.ClassSubject{{Name: "Math", Blocks: 2}}},
					{Name: "Geometry", Subjects: []config.ClassSubject{{Name: "History", Blocks: 2}}},
				},
			},
			want: &validation.Error{Subject: "classes[1].subjects[0]", Field: "name"},
		},
		{
			name: "class-level error stops at the class segment",
			cfg: &config.Config{
				Subjects: []config.Subject{{Name: "Math"}},
				Classes: []config.Class{
					{Name: "", Subjects: []config.ClassSubject{{Name: "Math", Blocks: 1}}},
				},
			},
			want: &validation.Error{Subject: "classes[0]", Field: "name"},
		},
		{
			name: "valid config",
			cfg:  classWith("Math", 2),
			want: nil,
		},
		{
			name: "empty config",
			cfg:  &config.Config{},
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
