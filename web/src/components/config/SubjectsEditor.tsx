import type { Subject } from '../../types/config'

interface Props {
  subjects: Subject[]
  onChange: (subjects: Subject[]) => void
}

export function SubjectsEditor({ subjects, onChange }: Props) {
  const update = (index: number, name: string) => {
    const next = subjects.map((s, i) => (i === index ? { ...s, name } : s))
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(subjects.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...subjects]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index: number) => {
    if (index === subjects.length - 1) return
    const next = [...subjects]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  const add = () => {
    onChange([...subjects, { name: '' }])
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Subjects</h2>
      <div className="space-y-2">
        {subjects.map((subject, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm text-gray-400">{i + 1}.</span>
            <input
              type="text"
              value={subject.name}
              onChange={e => update(i, e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="Subject name"
            />
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              ^
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === subjects.length - 1}
              className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              v
            </button>
            <button
              onClick={() => remove(i)}
              className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
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
