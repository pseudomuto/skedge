import { useState } from 'react'

import type { Class, ClassSubject, Subject } from '../../types/config'

interface Props {
  classes: Class[]
  subjects: Subject[]
  onChange: (classes: Class[]) => void
}

interface ClassPanelProps {
  cls: Class
  subjects: Subject[]
  onUpdate: (updated: Class) => void
  onRemove: () => void
}

function ClassPanel({ cls, subjects, onUpdate, onRemove }: ClassPanelProps) {
  const [cohortInput, setCohortInput] = useState(cls.cohorts.join(', '))

  const updateName = (name: string) => onUpdate({ ...cls, name })

  const commitCohorts = (raw: string) => {
    const cohorts = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    onUpdate({ ...cls, cohorts })
  }

  const updateSubjectBlocks = (subjectName: string, blocks: number) => {
    const existing = cls.subjects.find((s) => s.name === subjectName)
    let next: ClassSubject[]
    if (blocks <= 0) {
      next = cls.subjects.filter((s) => s.name !== subjectName)
    } else if (existing) {
      next = cls.subjects.map((s) => (s.name === subjectName ? { ...s, blocks } : s))
    } else {
      next = [...cls.subjects, { name: subjectName, blocks }]
    }
    onUpdate({ ...cls, subjects: next })
  }

  const getBlocks = (subjectName: string): number => {
    return cls.subjects.find((s) => s.name === subjectName)?.blocks ?? 0
  }

  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          value={cls.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Class name"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium focus:border-blue-400 focus:outline-none"
        />
        <button onClick={onRemove} className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50">
          Remove
        </button>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">Cohorts (comma-separated)</label>
        <input
          type="text"
          value={cohortInput}
          onChange={(e) => setCohortInput(e.target.value)}
          onBlur={(e) => commitCohorts(e.target.value)}
          placeholder="e.g. A, B, C"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      {sortedSubjects.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Subjects (blocks per week, 0 = excluded)</p>
          <div className="space-y-1">
            {sortedSubjects.map((subject) => (
              <div key={subject.name} className="flex items-center gap-2">
                <span className="w-32 text-sm text-gray-700">{subject.name}</span>
                <input
                  type="number"
                  min={0}
                  value={getBlocks(subject.name)}
                  onChange={(e) => updateSubjectBlocks(subject.name, parseInt(e.target.value, 10) || 0)}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClassesEditor({ classes, subjects, onChange }: Props) {
  const sorted = [...classes].sort((a, b) => {
    if (!a.name && !b.name) return 0
    if (!a.name) return 1
    if (!b.name) return -1
    return a.name.localeCompare(b.name)
  })

  const updateAt = (index: number, updated: Class) => {
    onChange(classes.map((c, i) => (i === index ? updated : c)))
  }

  const remove = (index: number) => {
    onChange(classes.filter((_, i) => i !== index))
  }

  const add = () => {
    onChange([...classes, { name: '', cohorts: [], subjects: [] }])
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Classes</h2>
      <div className="space-y-3">
        {sorted.map((cls) => {
          const origIdx = classes.indexOf(cls)
          return (
            <ClassPanel
              key={origIdx}
              cls={cls}
              subjects={subjects}
              onUpdate={(updated) => updateAt(origIdx, updated)}
              onRemove={() => remove(origIdx)}
            />
          )
        })}
      </div>
      <button
        onClick={add}
        className="mt-3 rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
      >
        + Add Class
      </button>
    </div>
  )
}
