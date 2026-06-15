import { useEffect, useState } from 'react'

import type { Class, ClassSubject, Subject } from '../../types/config'

interface Props {
  cls: Class
  subjects: Subject[]
  onSave: (updated: Class) => void
  onRemove?: () => void
  onClose: () => void
}

export function ClassModal({ cls, subjects, onSave, onRemove, onClose }: Props) {
  const [name, setName] = useState(cls.name)
  const [cohortInput, setCohortInput] = useState(cls.cohorts.join(', '))
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>(cls.subjects)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parsedCohorts = (): string[] =>
    cohortInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

  const getBlocks = (subjectName: string): number =>
    classSubjects.find((s) => s.name === subjectName)?.blocks ?? 0

  const updateSubjectBlocks = (subjectName: string, blocks: number) => {
    const existing = classSubjects.find((s) => s.name === subjectName)
    let next: ClassSubject[]
    if (blocks <= 0) {
      next = classSubjects.filter((s) => s.name !== subjectName)
    } else if (existing) {
      next = classSubjects.map((s) => (s.name === subjectName ? { ...s, blocks } : s))
    } else {
      next = [...classSubjects, { name: subjectName, blocks }]
    }
    setClassSubjects(next)
  }

  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name))

  const handleSave = () => {
    onSave({ name, cohorts: parsedCohorts(), subjects: classSubjects })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(28,28,46,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: 'var(--brand)' }}>
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            {name.trim() || 'New Class'}
          </h2>
          <button onClick={onClose} className="text-lg leading-none text-white/60 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Class name"
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Cohorts (comma-separated)
            </label>
            <input
              type="text"
              value={cohortInput}
              onChange={(e) => setCohortInput(e.target.value)}
              placeholder="e.g. A, B, C"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {sortedSubjects.length > 0 && (
            <div>
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                Subjects (blocks per week)
              </p>
              <div className="space-y-2">
                {sortedSubjects.map((subject) => (
                  <div key={subject.name} className="flex items-center gap-3">
                    <span className="w-32 text-sm" style={{ color: 'var(--text)' }}>
                      {subject.name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={getBlocks(subject.name)}
                      onChange={(e) => updateSubjectBlocks(subject.name, parseInt(e.target.value, 10) || 0)}
                      className="w-20 rounded-lg px-2 py-1 text-sm focus:outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            {onRemove && (
              <button onClick={onRemove} className="text-sm text-red-500 hover:text-red-700 transition-colors">
                Remove class
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
