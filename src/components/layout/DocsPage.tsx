const sections = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'sharing-terms', label: 'Sharing terms' },
]

const concepts = [
  {
    term: 'Block',
    def: 'A named time slot in the school day, like "Period 1" or "Morning Block". Blocks repeat across all five days.',
  },
  {
    term: 'Subject',
    def: 'A course or activity, like "Math" or "Art". Subjects are shared across classes.',
  },
  {
    term: 'Class',
    def: 'A group of students that splits into smaller cohorts. Each class has its own subject requirements and teacher assignments.',
  },
  {
    term: 'Cohort',
    def: 'A subdivision of a class that rotates through subjects independently. Cohorts within the same class are scheduled in parallel.',
  },
  {
    term: 'Teacher',
    def: 'A staff member with a room assignment and a list of subjects they can teach per class. The solver uses these to avoid double-booking.',
  },
  {
    term: 'Term',
    def: 'A named container for one complete set of config and its generated schedule. Switch between terms using the selector in the header.',
  },
]

const constraints = [
  'A teacher can only be in one place at a time - no double-booking across classes or cohorts.',
  'A room can only host one cohort per time slot. Each teacher has a fixed room, and the solver tracks room occupancy directly to prevent two cohorts from sharing a room at the same time.',
  'No teacher is assigned more than 21 blocks in a week.',
  'A cohort cannot have the same subject twice in one day.',
  'Each cohort gets exactly the number of sessions per subject you configured - no more, no less.',
  'Every time slot must be filled. skedge does not produce schedules with free periods.',
  'Teachers are only assigned to subjects and classes they are authorized for in your config.',
]

const steps = [
  {
    step: '1. Config',
    desc: 'Define your time blocks, subjects, and classes. For each class, add its cohorts and how many sessions per week each subject needs.',
  },
  {
    step: '2. Teachers',
    desc: 'Add each teacher, assign them a room, and specify which subjects they can cover for each class.',
  },
  {
    step: '3. Schedule',
    desc: 'Click Generate. skedge finds a valid weekly schedule or tells you why no solution is possible with the current setup.',
  },
]

export function DocsPage() {
  return (
    <div className="space-y-12">
      <nav
        className="rounded-lg border p-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          On this page
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="getting-started">
        <h2
          className="mb-3 border-b-2 pb-2 text-lg font-semibold"
          style={{ borderColor: 'var(--brand)', color: 'var(--text)' }}
        >
          Getting started
        </h2>
        <p className="mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>
          skedge works best when you fill in the three tabs in order. Each one builds on the last, so jumping ahead to
          Schedule before finishing Config will leave you with nothing to generate.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map(({ step, desc }) => (
            <div
              key={step}
              className="rounded-lg border p-4"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {step}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works">
        <h2
          className="mb-3 border-b-2 pb-2 text-lg font-semibold"
          style={{ borderColor: 'var(--brand)', color: 'var(--text)' }}
        >
          How it works
        </h2>
        <p className="mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          When you click Generate, skedge runs a constraint solver in a background thread. It works in two phases per
          attempt, and retries the whole sequence up to 100 times with a fresh random ordering if it gets stuck.
        </p>
        <p className="mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          Phase 1 assigns subjects to each cohort's time slots using backtracking - if a partial assignment hits a dead
          end, it backtracks and tries a different subject ordering. Phase 2 then assigns a teacher and room to each
          slot, again using backtracking, this time prioritizing the slots with the fewest eligible teachers first.
        </p>
        <p className="mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          The solver enforces these rules on every schedule it produces:
        </p>
        <ul className="mb-3 space-y-2">
          {constraints.map((c) => (
            <li key={c} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              <span className="mt-0.5 shrink-0 font-bold" style={{ color: 'var(--brand)' }}>
                -
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="leading-relaxed" style={{ color: 'var(--text)' }}>
          If no valid assignment exists - for example, because a teacher would need to cover more than 21 blocks, or
          there are not enough teachers for a subject - skedge reports the failure rather than returning a broken
          schedule.
        </p>
      </section>

      <section id="concepts">
        <h2
          className="mb-3 border-b-2 pb-2 text-lg font-semibold"
          style={{ borderColor: 'var(--brand)', color: 'var(--text)' }}
        >
          Concepts
        </h2>
        <dl className="space-y-3">
          {concepts.map(({ term, def }) => (
            <div key={term} className="grid gap-1 sm:grid-cols-[120px_1fr]">
              <dt className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {term}
              </dt>
              <dd className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="privacy">
        <h2
          className="mb-3 border-b-2 pb-2 text-lg font-semibold"
          style={{ borderColor: 'var(--brand)', color: 'var(--text)' }}
        >
          Privacy
        </h2>
        <p className="mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          Everything in skedge runs in your browser. There is no account, no server, and no network request involved in
          generating or storing a schedule. Your data never leaves your device.
        </p>
        <p className="leading-relaxed" style={{ color: 'var(--text)' }}>
          All config and schedule data is saved to your browser's local storage (IndexedDB). It persists between
          sessions on the same device and browser, but it is not synced anywhere. Clearing your browser data will remove
          it.
        </p>
      </section>

      <section id="sharing-terms">
        <h2
          className="mb-3 border-b-2 pb-2 text-lg font-semibold"
          style={{ borderColor: 'var(--brand)', color: 'var(--text)' }}
        >
          Sharing terms
        </h2>
        <p className="mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
          Since there's no server, sharing works through file export. Open the term selector in the top-right corner and
          choose Export. This downloads a JSON file containing the full config and generated schedule for that term.
        </p>
        <p className="leading-relaxed" style={{ color: 'var(--text)' }}>
          To load someone else's term, open the term selector and choose Import, then select the JSON file. The imported
          term is added alongside your existing ones - it won't overwrite anything. From there you can view the config,
          tweak it, and regenerate the schedule.
        </p>
      </section>
    </div>
  )
}
