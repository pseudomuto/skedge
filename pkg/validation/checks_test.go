package validation_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pseudomuto/skedge/pkg/validation"
)

type sampleStruct struct {
	Name string
	Age  int
}

func TestRequired_String(t *testing.T) {
	t.Parallel()

	check := validation.Required[string]()
	require.NoError(t, check("foo"))
	require.Error(t, check(""))
}

func TestRequired_Int(t *testing.T) {
	t.Parallel()

	check := validation.Required[int]()
	require.NoError(t, check(42))
	require.NoError(t, check(-1))
	require.Error(t, check(0))
}

func TestRequired_Pointer(t *testing.T) {
	t.Parallel()

	check := validation.Required[*string]()
	s := "x"
	require.NoError(t, check(&s))
	require.Error(t, check(nil))
}

func TestRequired_Struct(t *testing.T) {
	t.Parallel()

	check := validation.Required[sampleStruct]()
	require.NoError(t, check(sampleStruct{Name: "bob"}))
	require.Error(t, check(sampleStruct{}))
}

func TestRequired_TypeInferenceWithField(t *testing.T) {
	t.Parallel()

	// Sanity check that Required composes with Field. Note: Required must be
	// explicitly instantiated (Required[string]()) because Go's type inference
	// does not propagate Field's V through the Check[V] return type.
	rule := validation.Field("name", "", validation.Required[string]())
	errs := rule()
	require.Len(t, errs, 1)
}

func TestLT_Int(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		value   int
		wantErr bool
	}{
		{name: "below ref passes", value: 9, wantErr: false},
		{name: "equal to ref fails", value: 10, wantErr: true},
		{name: "above ref fails", value: 11, wantErr: true},
	}

	check := validation.LT(10)
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := check(tc.value)
			if tc.wantErr {
				require.EqualError(t, err, "must be less than 10")
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestLT_String(t *testing.T) {
	t.Parallel()

	check := validation.LT("m")
	require.NoError(t, check("a"))
	require.Error(t, check("m"))
	require.Error(t, check("z"))
}

func TestGT_Int(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		value   int
		wantErr bool
	}{
		{name: "above ref passes", value: 11, wantErr: false},
		{name: "equal to ref fails", value: 10, wantErr: true},
		{name: "below ref fails", value: 9, wantErr: true},
	}

	check := validation.GT(10)
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := check(tc.value)
			if tc.wantErr {
				require.EqualError(t, err, "must be greater than 10")
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestGT_String(t *testing.T) {
	t.Parallel()

	check := validation.GT("m")
	require.NoError(t, check("z"))
	require.Error(t, check("m"))
	require.Error(t, check("a"))
}

func TestLTAndGT_InferredFromField(t *testing.T) {
	t.Parallel()

	// Sanity check that LT and GT compose with Field. Unlike Required and
	// Unique, ref lets Go infer V from the argument, so no explicit
	// instantiation is needed.
	rule := validation.Field("age", 200, validation.LT(150), validation.GT(0))
	errs := rule()
	require.Len(t, errs, 1)
	require.Equal(t, "must be less than 150", errs[0].Message)
}

func TestUnique(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		input   []string
		wantErr bool
	}{
		{name: "empty slice", input: nil, wantErr: false},
		{name: "single element", input: []string{"a"}, wantErr: false},
		{name: "all distinct", input: []string{"a", "b", "c"}, wantErr: false},
		{name: "one duplicate", input: []string{"a", "b", "a"}, wantErr: true},
		{name: "multiple duplicates", input: []string{"a", "a", "b", "b"}, wantErr: true},
	}

	check := validation.Unique[string]()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := check(tc.input)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestUnique_Int(t *testing.T) {
	t.Parallel()

	check := validation.Unique[int]()
	require.NoError(t, check([]int{1, 2, 3}))
	require.Error(t, check([]int{1, 2, 2}))
}

func TestUnique_InferredFromField(t *testing.T) {
	t.Parallel()

	// Sanity check that Unique composes with Field. Note: Unique must be
	// explicitly instantiated (Unique[string]()) because Go's type inference
	// does not propagate Field's V through the Check[V] return type.
	rule := validation.Field("tags", []string{"a", "a"}, validation.Unique[string]())
	errs := rule()
	require.Len(t, errs, 1)
}
