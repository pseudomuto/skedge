import type { Subject } from '../../types/config'

interface Props {
  subjects: Subject[]
  onChange: (subjects: Subject[]) => void
}

export function SubjectsEditor({ subjects, onChange }: Props) {
  const sorted = [...subjects].sort((a, b) => {
    if (!a.name && !b.name) return 0
    if (!a.name) return 1
    if (!b.name) return -1
    return a.name.localeCompare(b.name)
  })

  const update = (subject: Subject, name: string) => {
    onChange(subjects.map((s) => (s === subject ? { ...s, name } : s)))
  }

  const remove = (subject: Subject) => {
    onChange(subjects.filter((s) => s !== subject))
  }

  const add = () => {
    onChange([...subjects, { name: '' }])
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Subjects</h2>
      <div className="space-y-2">
        {sorted.map((subject) => {
          const origIdx = subjects.indexOf(subject)
          return (
            <div key={origIdx} className="flex items-center gap-2">
              <input
                type="text"
                value={subject.name}
                onChange={(e) => update(subject, e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Subject name"
              />
              <button
                onClick={() => remove(subject)}
                className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={add}
        className="mt-3 rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
      >
        + Add Subject
      </button>
    </div>
  )
}
