package config

import "github.com/pseudomuto/skedge/pkg/validation"

type (
	Teacher struct {
		Name     string           `yaml:"name"`
		Room     string           `yaml:"room"`
		Subjects []TeacherSubject `yaml:"subjects"`
	}

	TeacherSubject struct {
		Class    string   `yaml:"class"`
		Subjects []string `yaml:"subjects"`
	}
)

func (t *Teacher) validate(ctx validationContext) error {
	return validation.Validate(
		"",
		validation.Field("name", t.Name, validation.Required[string]()),
		validation.Field("room", t.Room, validation.Required[string]()),
		children(ctx, "subjects", t.Subjects),
	)
}

func (s *TeacherSubject) validate(ctx validationContext) error {
	return validation.Validate(
		"",
		validation.Field("class", s.Class, ctx.isClass()),
		validation.Each("subjects", s.Subjects, ctx.isSubject()),
	)
}
