// Package validation provides structured error primitives plus a small
// rule-based API for accumulating validation failures.
//
// An [Error] captures a single failure as a (Subject, Field, Message) triple,
// where Subject identifies the thing being validated (e.g. a hostname or
// certificate CN), Field names the attribute that failed, and Message
// describes the failure in human-readable form. [Errors] aggregates multiple
// [Error] values into a single error while remaining compatible with
// [errors.Is], [errors.As], and [errors.Join] via its Unwrap method.
//
// Higher-level validation is expressed by passing a list of [Rule] values to
// [Validate], typically constructed via [Field] and the built-in [Check]
// functions ([Required], [Unique], [IsHostPort]). [Field] runs Checks against a
// single value; [Each] is its per-element counterpart, running Checks against
// every element of a slice and stamping failures with an indexed field name
// (e.g. "tags[2]"). Validate accumulates every rule's output into one Errors
// value and stamps the supplied subject onto entries that don't already carry one.
//
// Conditional logic is expressed with the [When] family of combinators:
// [When] guards Checks on a value-aware predicate, [WhenFn] guards Checks on
// a value-free predicate (closing over outer state), and [WhenRules] guards
// an entire block of Rules. Nested struct validation is expressed with
// [Nested], which embeds a child's [Validator] (anything with
// Validate() error) as a Rule and prefixes a subject onto its entries,
// composing into a dotted path (e.g. "classes[0].subjects[1]") as levels nest.
package validation
