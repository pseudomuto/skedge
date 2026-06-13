package validation

import (
	"cmp"
	"errors"
	"fmt"
)

// Check verifies a single value of type V. A nil return means valid.
type Check[V any] func(V) error

// Required rejects the zero value of V. Note that this means Required[bool]()
// rejects false; reach for a different check when false is a meaningful value.
func Required[V comparable]() Check[V] {
	return func(v V) error {
		var zero V
		if v == zero {
			return errors.New("is required")
		}

		return nil
	}
}

// LT rejects values that are not strictly less than ref. The comparison is
// exclusive: a value equal to ref fails. It works for any cmp.Ordered type
// (numbers, strings, and other ordered kinds).
func LT[V cmp.Ordered](ref V) Check[V] {
	return func(v V) error {
		if v >= ref {
			return fmt.Errorf("must be less than %v", ref)
		}

		return nil
	}
}

// GT rejects values that are not strictly greater than ref. The comparison is
// exclusive: a value equal to ref fails. It works for any cmp.Ordered type
// (numbers, strings, and other ordered kinds).
func GT[V cmp.Ordered](ref V) Check[V] {
	return func(v V) error {
		if v <= ref {
			return fmt.Errorf("must be greater than %v", ref)
		}

		return nil
	}
}

// Unique rejects a slice containing two or more equal elements. The error
// message names the first duplicate encountered.
func Unique[V comparable]() Check[[]V] {
	return func(vs []V) error {
		seen := make(map[V]struct{}, len(vs))
		for _, v := range vs {
			if _, dup := seen[v]; dup {
				return fmt.Errorf("contains duplicate value: %v", v)
			}

			seen[v] = struct{}{}
		}

		return nil
	}
}
