package config

import (
	"fmt"

	"github.com/pseudomuto/skedge/pkg/validation"
)

type (
	// validationContext carries config-level data that sub-validators resolve
	// against. It is built once from the config under validation and threaded
	// explicitly into each child's validate, so there is no shared global state.
	validationContext struct {
		classes  map[string]struct{}
		subjects map[string]struct{}
	}

	contextValidator interface {
		validate(validationContext) error
	}
)

func (vc validationContext) isClass() validation.Check[string] {
	return func(name string) error {
		if _, ok := vc.classes[name]; !ok {
			return fmt.Errorf("unknown class: %s", name)
		}

		return nil
	}
}

func (vc validationContext) isSubject() validation.Check[string] {
	return func(name string) error {
		if _, ok := vc.subjects[name]; !ok {
			return fmt.Errorf("unknown subject: %s", name)
		}

		return nil
	}
}

func newValidationContext(c *Config) validationContext {
	classes := make(map[string]struct{}, len(c.Classes))
	subjects := make(map[string]struct{}, len(c.Subjects))

	for _, c := range c.Classes {
		classes[c.Name] = struct{}{}
	}

	for _, s := range c.Subjects {
		subjects[s.Name] = struct{}{}
	}

	return validationContext{
		classes:  classes,
		subjects: subjects,
	}
}

func children[T any, PT interface {
	*T
	contextValidator
}](ctx validationContext, name string, items []T) validation.Rule {
	return validation.Children(name, items, func(v *T) error {
		return PT(v).validate(ctx)
	})
}
