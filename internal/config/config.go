package config

import (
	"io"

	"github.com/goccy/go-yaml"

	"github.com/pseudomuto/skedge/pkg/validation"
)

type (
	Config struct {
		Blocks   []string  `yaml:"blocks"`
		Classes  []Class   `yaml:"classes"`
		Subjects []Subject `yaml:"subjects"`
		Teachers []Teacher `yaml:"teachers"`
	}

	Subject struct {
		Name string `yaml:"name"`
	}
)

func Load(r io.Reader) (*Config, error) {
	var cfg Config
	if err := yaml.NewDecoder(r).Decode(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) Validate() error {
	ctx := newValidationContext(c)

	return validation.Validate(
		"",
		validation.Field("blocks", c.Blocks, validation.Unique[string]()),
		children(ctx, "classes", c.Classes),
		children(ctx, "subjects", c.Subjects),
		children(ctx, "teachers", c.Teachers),
	)
}

func (s *Subject) validate(validationContext) error {
	return validation.Validate("", validation.Field(
		"name",
		s.Name,
		validation.Required[string](),
	))
}
