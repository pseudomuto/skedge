package scheduler

type (
	// Class is the top-level schedule unit returned by [Scheduler.Generate]. It
	// contains one entry per cohort defined in the configuration.
	Class struct {
		Name    string
		Cohorts []Cohort
	}

	// Cohort is the weekly schedule for a single group of students. Every day
	// and every block is guaranteed to be fully assigned after generation.
	Cohort struct {
		Name     string
		Schedule []DailySchedule
	}

	// DailySchedule holds the ordered blocks assigned to a cohort on one day.
	DailySchedule struct {
		Day    string
		Blocks []Block
	}

	// Block is a single teaching slot. Name, Teacher, and Room are always
	// non-empty in a valid schedule; use [Validate] to confirm.
	Block struct {
		Name    string
		Teacher string
		Room    string
	}
)
