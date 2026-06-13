package validation

import "fmt"

// Rule produces zero or more validation errors when run.
type Rule func() Errors

// Field builds a Rule that runs every Check[V] against value and turns any
// failure into validation.Errors entries. The returned Errors have their
// Field stamped with name, unless the check returned a validation.Error or
// validation.Errors with Field already set, in which case the existing value
// is preserved.
func Field[V any](name string, value V, checks ...Check[V]) Rule {
	return func() Errors {
		var errs Errors
		for _, c := range checks {
			if err := c(value); err != nil {
				errs = append(errs, toErrors(name, err)...)
			}
		}

		return errs
	}
}

// Each builds a Rule that runs every Check[V] against each element of values,
// turning any failure into validation.Errors entries. Each failing element's
// errors have their Field stamped with "name[i]" (e.g. "tags[2]"), unless the
// check returned a validation.Error or validation.Errors with Field already
// set, in which case the existing value is preserved. An empty or nil slice
// yields no errors.
func Each[S ~[]V, V any](name string, values S, checks ...Check[V]) Rule {
	return func() Errors {
		var errs Errors
		for i, v := range values {
			field := fmt.Sprintf("%s[%d]", name, i)
			for _, c := range checks {
				if err := c(v); err != nil {
					errs = append(errs, toErrors(field, err)...)
				}
			}
		}

		return errs
	}
}
