package config

import (
	"github.com/pseudomuto/skedge/pkg/validation"
)

type (
	Class struct {
		Name     string         `yaml:"name"`
		Cohorts  []string       `yaml:"cohorts"`
		Subjects []ClassSubject `yaml:"subjects"`
	}

	ClassSubject struct {
		Name   string `yaml:"name"`
		Blocks int    `yaml:"blocks"`
	}
)

func (c *Class) validate(ctx validationContext) error {
	return validation.Validate(
		"",
		validation.Field("name", c.Name, validation.Required[string]()),
		validation.Field("cohorts", c.Cohorts, validation.Unique[string]()),
		children(ctx, "subjects", c.Subjects),
	)
}

func (s *ClassSubject) validate(ctx validationContext) error {
	return validation.Validate(
		"",
		validation.Field("name", s.Name, ctx.isSubject()),
		validation.Field("blocks", s.Blocks, validation.GT(0)),
	)
}
